package expo.modules.dynamiccolormodule

import android.app.WallpaperManager
import android.graphics.Color as AndroidColor
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import com.google.android.material.color.utilities.CorePalette
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale
import kotlinx.coroutines.launch

/**
 * Reads Android 12+ wallpaper-derived Material You colors and converts them to
 * a full tonal palette that the JS theme layer can use directly. All failures
 * are swallowed and reported as `null` so the app can fall back to its static
 * palettes (Expo Go, old Android, OEM quirks, etc.).
 */
class DynamicColorModule : Module() {
    private var colorsListener: WallpaperManager.OnColorsChangedListener? = null
    private var cachedSeeds: IntArray? = null

    override fun definition() = ModuleDefinition {
        Name("DynamicColorModule")

        Events("onWallpaperColorsChanged")

        AsyncFunction("getWallpaperSeedColors") { promise: Promise ->
            try {
                val seeds = resolveSeeds()
                if (seeds == null) {
                    promise.resolve(null)
                } else {
                    promise.resolve(
                        mapOf(
                            "primary" to hex(seeds[0]),
                            "secondary" to hex(seeds[1]),
                            "tertiary" to hex(seeds[2]),
                        )
                    )
                }
            } catch (e: Exception) {
                Log.w(TAG, "getWallpaperSeedColors failed", e)
                promise.resolve(null)
            }
        }

        AsyncFunction("getDynamicPalette") { isDark: Boolean, promise: Promise ->
            try {
                val seeds = resolveSeeds()
                if (seeds == null) {
                    promise.resolve(null)
                } else {
                    val palette = buildPalette(seeds, isDark)
                    if (palette == null) promise.resolve(null) else promise.resolve(palette)
                }
            } catch (e: Exception) {
                Log.w(TAG, "getDynamicPalette failed", e)
                promise.resolve(null)
            }
        }

        AsyncFunction("setSystemBarTone") { color: String, isDark: Boolean, promise: Promise ->
            // AsyncFunctions run on Expo's background queue. Window/View updates
            // must happen on the main thread or Android throws
            // CalledFromWrongThreadException and silently keeps the old bars.
            appContext.mainQueue.launch {
                try {
                    val activity = appContext.currentActivity
                    val window = activity?.window
                    if (window == null) {
                        promise.resolve(false)
                        return@launch
                    }
                    val parsed = AndroidColor.parseColor(color)
                    window.statusBarColor = parsed
                    window.navigationBarColor = parsed
                    // Edge-to-edge draws system-bar areas from the view behind
                    // them. A React Native Modal is a separate dialog window, so
                    // tint the focused root (the dialog when it is open) as well
                    // as the Activity decor and use that window's insets controller.
                    window.decorView.setBackgroundColor(parsed)
                    val focusedRoot = activity.currentFocus?.rootView
                    focusedRoot?.setBackgroundColor(parsed)
                    val controller = focusedRoot?.let { ViewCompat.getWindowInsetsController(it) }
                        ?: WindowCompat.getInsetsController(window, window.decorView)
                    controller?.isAppearanceLightStatusBars = !isDark
                    controller?.isAppearanceLightNavigationBars = !isDark
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        window.isNavigationBarContrastEnforced = false
                    }
                    promise.resolve(true)
                } catch (e: Exception) {
                    Log.w(TAG, "setSystemBarTone failed", e)
                    promise.resolve(false)
                }
            }
        }

        OnStartObserving {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val context = appContext.reactContext ?: return@OnStartObserving
                val manager = WallpaperManager.getInstance(context) ?: return@OnStartObserving
                val listener = object : WallpaperManager.OnColorsChangedListener {
                    override fun onColorsChanged(colors: android.app.WallpaperColors?, which: Int) {
                        cachedSeeds = null
                        sendEvent("onWallpaperColorsChanged", emptyMap<String, Any>())
                    }
                }
                colorsListener = listener
                try {
                    manager.addOnColorsChangedListener(listener, Handler(Looper.getMainLooper()))
                } catch (e: Exception) {
                    Log.w(TAG, "addOnColorsChangedListener failed", e)
                }
            }
        }

        OnStopObserving {
            // Force a fresh wallpaper query the next time dynamic colors are enabled:
            // the wallpaper may change while no listener is registered.
            cachedSeeds = null
            colorsListener?.let { listener ->
                try {
                    appContext.reactContext?.let { context ->
                        WallpaperManager.getInstance(context)?.removeOnColorsChangedListener(listener)
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "removeOnColorsChangedListener failed", e)
                }
            }
            colorsListener = null
        }
    }

    private fun resolveSeeds(): IntArray? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return null
        cachedSeeds?.let { return it }
        val context = appContext.reactContext ?: return null
        val colors = WallpaperManager.getInstance(context)
            ?.getWallpaperColors(WallpaperManager.FLAG_SYSTEM) ?: return null

        // CompileSdk 36 exposes these as android.graphics.Color; toArgb() works
        // for both the boxed Color and legacy Int signatures.
        val primary = colors.primaryColor.toArgb()
        val secondary = (colors.secondaryColor ?: colors.primaryColor).toArgb()
        val tertiary = (colors.tertiaryColor ?: colors.secondaryColor ?: colors.primaryColor).toArgb()
        val seeds = intArrayOf(primary, secondary, tertiary)
        cachedSeeds = seeds
        return seeds
    }

    private fun buildPalette(seeds: IntArray, isDark: Boolean): Map<String, String>? {
        val core = CorePalette.of(seeds[0])
        val a1 = core.a1
        val a2 = core.a2
        val a3 = core.a3
        val n1 = core.n1
        val err = core.error

        val primary = a1.tone(if (isDark) 80 else 40)
        val background = n1.tone(if (isDark) 6 else 98)

        // Some OEM wallpapers yield very low-contrast seeds. Rather than ship an
        // unreadable UI, ask JS to keep its high-contrast static fallback.
        if (contrastRatio(primary, background) < 3.0) return null

        fun spot(palette: com.google.android.material.color.utilities.TonalPalette, dark: Int, light: Int) =
            hex(palette.tone(if (isDark) dark else light))

        val primaryHex = hex(primary)
        return mapOf(
            "primary" to primaryHex,
            "primaryContainer" to spot(a1, 30, 90),
            "onPrimaryContainer" to spot(a1, 90, 10),
            "secondary" to spot(a2, 80, 60),
            "accent" to spot(a3, 80, 40),
            "background" to hex(background),
            "surface" to spot(n1, 10, 95),
            "surfaceContainer" to spot(n1, 12, 92),
            "surfaceContainerHigh" to spot(n1, 17, 90),
            "surfaceContainerHighest" to spot(n1, 22, 88),
            "text" to spot(n1, 90, 10),
            "subtext" to spot(n1, 60, 50),
            "white" to "#FFFFFF",
            "error" to spot(err, 80, 40),
            "success" to (if (isDark) "#66DBB2" else "#006A4E"),
            "border" to spot(n1, 30, 80),
            "outlineVariant" to spot(n1, 24, 85),
            "glow" to rgba(primary, 0.15f),
        )
    }

    private fun hex(argb: Int): String = String.format(Locale.US, "#%06X", 0xFFFFFF and argb)

    private fun rgba(argb: Int, alpha: Float): String = String.format(
        Locale.US,
        "rgba(%d, %d, %d, %.2f)",
        (argb shr 16) and 0xFF,
        (argb shr 8) and 0xFF,
        argb and 0xFF,
        alpha,
    )

    private fun luminance(argb: Int): Double {
        val r = channelLuminance((argb shr 16) and 0xFF)
        val g = channelLuminance((argb shr 8) and 0xFF)
        val b = channelLuminance(argb and 0xFF)
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    private fun channelLuminance(value: Int): Double {
        val c = value / 255.0
        return if (c <= 0.03928) c / 12.92 else Math.pow((c + 0.055) / 1.055, 2.4)
    }

    private fun contrastRatio(a: Int, b: Int): Double {
        val la = luminance(a)
        val lb = luminance(b)
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
    }

    companion object {
        private const val TAG = "DynamicColorModule"
    }
}
