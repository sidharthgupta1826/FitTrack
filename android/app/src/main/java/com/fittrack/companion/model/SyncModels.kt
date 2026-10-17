package com.fittrack.companion.model

import com.google.gson.annotations.SerializedName

data class DailyStepRecord(
    @SerializedName("date") val date: String, // YYYY-MM-DD
    @SerializedName("steps") val steps: Long,
    @SerializedName("distanceKm") val distanceKm: Double,
    @SerializedName("calories") val calories: Long,
    @SerializedName("activeMinutes") val activeMinutes: Int,
    @SerializedName("source") val source: String // "health_connect" or "sensor"
)

data class SyncPayload(
    @SerializedName("syncToken") val syncToken: String,
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("deviceModel") val deviceModel: String,
    @SerializedName("source") val source: String,
    @SerializedName("records") val records: List<DailyStepRecord>,
    @SerializedName("stepGoal") val stepGoal: Int,
    @SerializedName("syncTimestamp") val syncTimestamp: String
)

data class SyncResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String?,
    @SerializedName("recordsReceived") val recordsReceived: Int?,
    @SerializedName("error") val error: String?
)

enum class TrackingSource(val displayName: String) {
    HEALTH_CONNECT("Health Connect (Aggregated)"),
    STEP_SENSOR("Hardware Sensor (TYPE_STEP_COUNTER)"),
    MANUAL_FALLBACK("Manual Entry Fallback")
}
