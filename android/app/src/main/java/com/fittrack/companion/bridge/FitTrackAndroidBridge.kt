package com.fittrack.companion.bridge

import android.content.Context
import android.os.Build
import android.webkit.JavascriptInterface
import com.fittrack.companion.healthconnect.HealthConnectManager
import com.fittrack.companion.sensor.StepSensorManager
import com.google.gson.Gson
import kotlinx.coroutines.runBlocking
import java.time.LocalDate

class FitTrackAndroidBridge(
    private val context: Context,
    private val healthConnectManager: HealthConnectManager,
    private val stepSensorManager: StepSensorManager
) {
    private val gson = Gson()

    @JavascriptInterface
    fun fetchHealthConnectSteps(): String {
        return runBlocking {
            if (healthConnectManager.isHealthConnectAvailable() && healthConnectManager.hasAllPermissions()) {
                val records = healthConnectManager.getHistoricalRecords(7)
                gson.toJson(records)
            } else if (stepSensorManager.isHardwareSensorSupported()) {
                val todaySteps = stepSensorManager.getCachedTodaySteps()
                val todayStr = LocalDate.now().toString()
                val distKm = (todaySteps * 0.76 / 1000.0 * 100.0).let { Math.round(it) / 100.0 }
                val calories = (todaySteps * 0.042).toLong()
                val list = listOf(
                    mapOf(
                        "date" to todayStr,
                        "steps" to todaySteps,
                        "distanceKm" to distKm,
                        "calories" to calories,
                        "activeMinutes" to (todaySteps / 105).toInt().coerceAtMost(300),
                        "source" to "sensor"
                    )
                )
                gson.toJson(list)
            } else {
                "[]"
            }
        }
    }

    @JavascriptInterface
    fun getDeviceInfo(): String {
        val info = mapOf(
            "manufacturer" to Build.MANUFACTURER,
            "model" to Build.MODEL,
            "sdkVersion" to Build.VERSION.SDK_INT,
            "isHealthConnectAvailable" to healthConnectManager.isHealthConnectAvailable(),
            "isStepSensorAvailable" to stepSensorManager.isHardwareSensorSupported()
        )
        return gson.toJson(info)
    }

    @JavascriptInterface
    fun isCompanionActive(): Boolean = true
}
