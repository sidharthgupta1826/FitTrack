package com.fittrack.companion.sync

import android.content.Context
import android.os.Build
import com.fittrack.companion.model.DailyStepRecord
import com.fittrack.companion.model.SyncPayload
import com.fittrack.companion.model.SyncResponse
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.time.Instant
import java.util.concurrent.TimeUnit

class FitTrackSyncService(private val context: Context) {

    private val prefs = context.getSharedPreferences("fittrack_sync_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .writeTimeout(12, TimeUnit.SECONDS)
        .build()

    fun getSyncServerUrl(): String {
        return prefs.getString("sync_server_url", "http://10.0.2.2:3000/api/sync")
            ?: "http://10.0.2.2:3000/api/sync"
    }

    fun setSyncServerUrl(url: String) {
        prefs.edit().putString("sync_server_url", url.trim()).apply()
    }

    fun getSyncToken(): String {
        return prefs.getString("sync_token", "FT-7492A1") ?: "FT-7492A1"
    }

    fun setSyncToken(token: String) {
        prefs.edit().putString("sync_token", token.trim().uppercase()).apply()
    }

    fun getLastSyncTime(): String? {
        return prefs.getString("last_sync_time", null)
    }

    private fun setLastSyncTime(timeIso: String) {
        prefs.edit().putString("last_sync_time", timeIso).apply()
    }

    fun getStepGoal(): Int {
        return prefs.getInt("daily_step_goal", 8000)
    }

    fun setStepGoal(goal: Int) {
        prefs.edit().putInt("daily_step_goal", goal).apply()
    }

    /**
     * Synchronize local daily records with the FitTrack web serverless API
     */
    suspend fun syncRecords(
        records: List<DailyStepRecord>,
        source: String
    ): Result<SyncResponse> = withContext(Dispatchers.IO) {
        val serverUrl = getSyncServerUrl()
        val syncToken = getSyncToken()
        val nowIso = Instant.now().toString()

        val payload = SyncPayload(
            syncToken = syncToken,
            deviceId = "Android-${Build.MODEL.replace(" ", "-")}",
            deviceModel = "${Build.MANUFACTURER} ${Build.MODEL}",
            source = source,
            records = records,
            stepGoal = getStepGoal(),
            syncTimestamp = nowIso
        )

        val jsonBody = gson.toJson(payload)
        val mediaType = "application/json; charset=utf-8".toMediaType()
        val requestBody = jsonBody.toRequestBody(mediaType)

        val request = Request.Builder()
            .url(serverUrl)
            .post(requestBody)
            .addHeader("Content-Type", "application/json")
            .addHeader("X-Sync-Token", syncToken)
            .build()

        try {
            val response = httpClient.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""

            if (!response.isSuccessful) {
                return@withContext Result.failure(
                    Exception("HTTP ${response.code}: $responseBody")
                )
            }

            val syncResponse = gson.fromJson(responseBody, SyncResponse::class.java)
            if (syncResponse.success) {
                setLastSyncTime(nowIso)
                Result.success(syncResponse)
            } else {
                Result.failure(Exception(syncResponse.error ?: "Synchronization was rejected by server."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
