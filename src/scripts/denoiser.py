import onnxruntime as ort
import numpy as np
import torch
import torch.nn.functional as F
import torchaudio
from tqdm import tqdm


class OnnxDF:
    """
    Wrapper for a DeepFilterNet ONNX model.
    """
    def __init__(self, model_path: str, device: str = "cpu"):
        self.device = device
        # 1. Load the ONNX runtime session
        providers = ["CPUExecutionProvider"]
        if device == "cuda" and ort.get_device() == 'GPU':
            providers.insert(0, "CUDAExecutionProvider")
        # IDk why it is
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = (
        ort.GraphOptimizationLevel.ORT_ENABLE_EXTENDED
        )
        
        sess_options.intra_op_num_threads = 1
        sess_options.inter_op_num_threads = 1
        sess_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        ###-----
        self.sess = ort.InferenceSession(model_path, sess_options, providers=providers)
        print(f"Successfully loaded model from {model_path}")
        print(f"Using provider: {self.sess.get_providers()[0]}")

        # 2. Get model input and output names and shapes from the model metadata.
        self.input_names = [i.name for i in self.sess.get_inputs()]
        self.output_names = [o.name for o in self.sess.get_outputs()]
        print("\nModel Inputs:")
        for i in self.sess.get_inputs():
            print(f"- Name: {i.name}, Shape: {i.shape}, Type: {i.type}")

        print("\nModel Outputs:")
        for o in self.sess.get_outputs():
            print(f"- Name: {o.name}, Shape: {o.shape}, Type: {o.type}")

        # Based on torchDF, we can find the model properties
        self.hop_size = 480 #512
        self.fft_size = 960
        self.frame_size = self.hop_size
        
        # Identify state inputs. They are any inputs that are not the main audio frame or atten_lim_db.
        self.state_input_names = [i.name for i in self.sess.get_inputs() if i.name not in ("input_frame", "atten_lim_db")]
        self.has_single_state_tensor = "states" in self.state_input_names

        if self.has_single_state_tensor:
            # Get the shape of the single 'states' tensor
            states_shape = [s.shape for s in self.sess.get_inputs() if s.name == "states"][0]
            self.states_len = states_shape[0]

    def init_states(self):
        """Initializes the recurrent states of the model."""
        if self.has_single_state_tensor:
            # The model expects a single flattened state tensor.
            states = np.zeros((self.states_len,), dtype=np.float32)
        else:
            # The model expects multiple state tensors.
            states = []
            for i in self.sess.get_inputs():
                if i.name in self.state_input_names:
                    states.append(np.zeros(i.shape, dtype=np.float32))
        atten_lim_db = np.array([0.0], dtype=np.float32)  # Default value
        return states, atten_lim_db

    def __call__(self, audio: torch.Tensor, sr: int):
        """
        Denoises a single-channel audio tensor.
 
        Args:
            audio (torch.Tensor): A single-channel audio tensor of shape [1, T].
            sr (int): The sample rate of the audio.
 
        Returns:
            torch.Tensor: The denoised audio tensor of shape [1, T].
        """
        if sr != 48000:
            print(f"Resampling audio from {sr}Hz to 48000Hz.")
            resampler = torchaudio.transforms.Resample(orig_freq=sr, new_freq=48000)
            audio = resampler(audio)
        if audio.shape[0] > 1:
            print("Warning: Audio has multiple channels, converting to mono.")
            audio = audio.mean(dim=0, keepdim=True)
        if audio.ndim == 1:
            audio = audio.unsqueeze(0)

        # Initialize states for each new audio file
        states, atten_lim_db = self.init_states()

        # Pad audio to be divisible by hop_size
        # This is to ensure we process all samples
        orig_len = audio.shape[-1]
        hop_size_divisible_padding_size = (self.hop_size - orig_len % self.hop_size) % self.hop_size
        # This padding is based on the original implementation to align with the STFT processing
        padded_audio = F.pad(audio, (0, self.fft_size + hop_size_divisible_padding_size))
        audio_chunks = torch.split(padded_audio.squeeze(0), self.hop_size)
        
        enhanced_frames = []
        
        print("Denoising audio...")
        for frame in tqdm(audio_chunks):
            # Prepare input feed for ONNX session
            input_feed = {"input_frame": frame.numpy()}
            if "atten_lim_db" in self.input_names:
                input_feed["atten_lim_db"] = atten_lim_db

            if self.has_single_state_tensor:
                input_feed["states"] = states
            else:
                for name, state_val in zip(self.state_input_names, states):
                    input_feed[name] = state_val

            # Run inference
            outputs = self.sess.run(self.output_names, input_feed)
            enhanced_frame = outputs[0]

            # Update states for the next frame
            if self.has_single_state_tensor:
                states = outputs[1]  # new_states is the second output
            else:
                # The new states are the outputs after the enhanced frame
                states = outputs[1:len(self.state_input_names)+1]

            enhanced_frames.append(torch.from_numpy(enhanced_frame))

        enhanced_audio = torch.cat(enhanced_frames).unsqueeze(0)
        # Trim the audio to the original length, accounting for the model's delay
        delay = self.fft_size - self.hop_size
        enhanced_audio = enhanced_audio[:, delay : orig_len + delay]
        return enhanced_audio



def main(args):
    """
    Main function to load model, process audio, and save the result.
    """
    try:
        # Load audio file
        noisy_audio, sr = torchaudio.load(args.input_path)
        print(f"Loaded audio from {args.input_path} with sample rate {sr}.")
    except Exception as e:
        print(f"Error loading audio file: {e}")
        return

    # Initialize the denoiser
    denoiser = OnnxDF(args.model_path)

    # Denoise the audio
    enhanced_audio = denoiser(noisy_audio, sr)

    # Save the enhanced audio
    try:
        torchaudio.save(
            args.output_path,
            enhanced_audio,
            48000,
            encoding="PCM_S",
            bits_per_sample=16,
        )
        print(f"Saved enhanced audio to {args.output_path}")
    except Exception as e:
        print(f"Error saving audio file: {e}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Denoise an audio file using a DeepFilterNet ONNX model.")
    parser.add_argument(
        "-m", "--model_path", 
        type=str, 
        default="./denoiser_model.onnx", 
        help="Path to the denoiser ONNX/ORT model file."
    )
    parser.add_argument(
        "-i", "--input_path", 
        type=str, 
        required=True, 
        help="Path to the noisy input audio file (WAV format)."
    )
    parser.add_argument(
        "-o", "--output_path", 
        type=str, 
        default="enhanced_audio.wav", 
        help="Path to save the enhanced output audio file."
    )
    
    cli_args = parser.parse_args()
    main(cli_args)
