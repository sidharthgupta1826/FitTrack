package com.fittrack.companion.sensor

import android.content.Context
import android.content.SharedPreferences
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.time.LocalDate
import java.time.format.DateTimeFormatter

class StepSensorManager(private val context: Context) : SensorEventListener {

    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
    private val stepCounterSensor: Sensor? = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)

    private val prefs: SharedPreferences = context.getSharedPreferences("fittrack_sensor_prefs", Context.MODE_PRIVATE)

    private val _todaySensorSteps = MutableStateFlow(0L)
    val todaySensorSteps: StateFlow<Long> = _todaySensorSteps.asStateFlow()

    private val _isSensorAvailable = MutableStateFlow(stepCounterSensor != null)
    val isSensorAvailable: StateFlow<Boolean> = _isSensorAvailable.asStateFlow()

    private val _isListening = MutableStateFlow(false)
    val isListening: StateFlow<Boolean> = _isListening.asStateFlow()

    fun isHardwareSensorSupported(): Boolean = stepCounterSensor != null

    fun startListening() {
        if (stepCounterSensor == null || sensorManager == null) return
        if (_isListening.value) return

        sensorManager.registerListener(this, stepCounterSensor, SensorManager.SENSOR_DELAY_UI)
        _isListening.value = true
    }

    fun stopListening() {
        if (!_isListening.value || sensorManager == null) return
        sensorManager.unregisterListener(this)
        _isListening.value = false
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null || event.sensor.type != Sensor.TYPE_STEP_COUNTER) return

        val totalStepsSinceReboot = event.values[0].toLong()
        val todayStr = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)

        val savedDate = prefs.getString("baseline_date", "")
        var baselineSteps = prefs.getLong("baseline_steps", -1L)

        // Reset baseline if it's a new day or if device rebooted (raw counter < baseline)
        if (savedDate != todayStr || baselineSteps == -1L || totalStepsSinceReboot < baselineSteps) {
            baselineSteps = totalStepsSinceReboot
            prefs.edit()
                .putString("baseline_date", todayStr)
                .putLong("baseline_steps", baselineSteps)
                .apply()
        }

        val calculatedTodaySteps = (totalStepsSinceReboot - baselineSteps).coerceAtLeast(0L)
        _todaySensorSteps.value = calculatedTodaySteps
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // No-op for step counter sensor
    }

    fun getCachedTodaySteps(): Long {
        return _todaySensorSteps.value
    }
}
