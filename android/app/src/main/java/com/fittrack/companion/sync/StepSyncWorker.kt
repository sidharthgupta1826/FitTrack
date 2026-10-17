package com.fittrack.companion.sync

import android.content.Context
import androidx.work.*
import com.fittrack.companion.healthconnect.HealthConnectManager
import com.fittrack.companion.model.DailyStepRecord
import com.fittrack.companion.sensor.StepSensorManager
import java.time.LocalDate
import java.util.concurrent.TimeUnit

class StepSyncWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    private val healthConnectManager = HealthConnectManager(context)
    private val stepSensorManager = StepSensorManager(context)
    private val syncService = FitTrackSyncService(context)

    override suspend fun doWork(): Result {
        return try {
            val records: List<DailyStepRecord>
            val source: String

            if (healthConnectManager.isHealthConnectAvailable() && healthConnectManager.hasAllPermissions()) {
                records = healthConnectManager.getHistoricalRecords(7)
                source = "health_connect"
            } else if (stepSensorManager.isHardwareSensorSupported()) {
                val todaySteps = stepSensorManager.getCachedTodaySteps()
                val todayStr = LocalDate.now().toString()
                val distKm = (todaySteps * 0.76 / 1000.0 * 100.0).let { Math.round(it) / 100.0 }
                val calories = (todaySteps * 0.042).toLong()

                records = listOf(
                    DailyStepRecord(
                        date = todayStr,
                        steps = todaySteps,
                        distanceKm = distKm,
                        calories = calories,
                        activeMinutes = (todaySteps / 105).toInt().coerceAtMost(300),
                        source = "sensor"
                    )
                )
                source = "sensor"
            } else {
                // No automated tracking provider available
                return Result.success()
            }

            if (records.isEmpty()) {
                return Result.success()
            }

            val syncResult = syncService.syncRecords(records, source)
            if (syncResult.isSuccess) {
                Result.success()
            } else {
                // Retry if network error or temporary server outage
                Result.retry()
            }
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        private const val UNIQUE_WORK_NAME = "FitTrack_StepSyncWorker"

        /**
         * Enqueue periodic background sync respecting Android battery and Doze mode restrictions
         */
        fun enqueuePeriodicSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val syncRequest = PeriodicWorkRequestBuilder<StepSyncWorker>(
                1, TimeUnit.HOURS,
                15, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.MINUTES)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                UNIQUE_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                syncRequest
            )
        }

        /**
         * Trigger immediate one-time sync
         */
        fun enqueueOneTimeSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val oneTimeRequest = OneTimeWorkRequestBuilder<StepSyncWorker>()
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueue(oneTimeRequest)
        }
    }
}
