package com.fittrack.companion.healthconnect

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.fittrack.companion.model.DailyStepRecord
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class HealthConnectManager(private val context: Context) {

    val permissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class)
    )

    fun getSdkStatus(): Int {
        return HealthConnectClient.getSdkStatus(context)
    }

    fun isHealthConnectAvailable(): Boolean {
        return getSdkStatus() == HealthConnectClient.SDK_AVAILABLE
    }

    private fun getClient(): HealthConnectClient? {
        return if (isHealthConnectAvailable()) {
            HealthConnectClient.getOrCreate(context)
        } else {
            null
        }
    }

    suspend fun hasAllPermissions(): Boolean {
        val client = getClient() ?: return false
        val granted = client.permissionController.getGrantedPermissions()
        return granted.containsAll(permissions)
    }

    /**
     * Read aggregated daily steps for a specific date using Health Connect Aggregation.
     * This avoids double-counting steps from multiple fitness trackers or smartphone sensors.
     */
    suspend fun getAggregatedDailySteps(date: LocalDate): Long {
        val client = getClient() ?: return 0L

        val zoneId = ZoneId.systemDefault()
        val startOfDay = date.atStartOfDay(zoneId).toInstant()
        val endOfDay = date.plusDays(1).atStartOfDay(zoneId).toInstant()

        return try {
            val response = client.aggregate(
                AggregateRequest(
                    metrics = setOf(StepsRecord.COUNT_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(startOfDay, endOfDay)
                )
            )
            response[StepsRecord.COUNT_TOTAL] ?: 0L
        } catch (e: Exception) {
            0L
        }
    }

    /**
     * Read complete daily aggregates (steps, distance in km, calories) for a date
     */
    suspend fun getDailyRecord(date: LocalDate): DailyStepRecord {
        val client = getClient()
        val dateStr = date.format(DateTimeFormatter.ISO_LOCAL_DATE)

        if (client == null) {
            return DailyStepRecord(
                date = dateStr,
                steps = 0L,
                distanceKm = 0.0,
                calories = 0L,
                activeMinutes = 0,
                source = "health_connect"
            )
        }

        val zoneId = ZoneId.systemDefault()
        val startOfDay = date.atStartOfDay(zoneId).toInstant()
        val endOfDay = date.plusDays(1).atStartOfDay(zoneId).toInstant()

        return try {
            val response = client.aggregate(
                AggregateRequest(
                    metrics = setOf(
                        StepsRecord.COUNT_TOTAL,
                        DistanceRecord.DISTANCE_TOTAL,
                        TotalCaloriesBurnedRecord.ENERGY_TOTAL
                    ),
                    timeRangeFilter = TimeRangeFilter.between(startOfDay, endOfDay)
                )
            )

            val steps = response[StepsRecord.COUNT_TOTAL] ?: 0L
            val distanceMeters = response[DistanceRecord.DISTANCE_TOTAL]?.inMeters ?: (steps * 0.76)
            val distanceKm = (distanceMeters / 1000.0 * 100.0).let { Math.round(it) / 100.0 }
            val energyCalories = response[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories?.toLong()
                ?: (steps * 0.042).toLong()
            val activeMinutes = (steps / 105).toInt().coerceAtMost(300)

            DailyStepRecord(
                date = dateStr,
                steps = steps,
                distanceKm = distanceKm,
                calories = energyCalories,
                activeMinutes = activeMinutes,
                source = "health_connect"
            )
        } catch (e: Exception) {
            DailyStepRecord(
                date = dateStr,
                steps = 0L,
                distanceKm = 0.0,
                calories = 0L,
                activeMinutes = 0,
                source = "health_connect"
            )
        }
    }

    /**
     * Get records for the last N days (for weekly syncing with FitTrack)
     */
    suspend fun getHistoricalRecords(daysCount: Int = 7): List<DailyStepRecord> {
        val today = LocalDate.now()
        val list = mutableListOf<DailyStepRecord>()
        for (i in (daysCount - 1) downTo 0) {
            val d = today.minusDays(i.toLong())
            val rec = getDailyRecord(d)
            if (rec.steps > 0 || i == 0) {
                list.add(rec)
            }
        }
        return list
    }
}
