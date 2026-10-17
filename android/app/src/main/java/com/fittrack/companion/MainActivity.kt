package com.fittrack.companion

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.health.connect.client.PermissionController
import com.fittrack.companion.healthconnect.HealthConnectManager
import com.fittrack.companion.sensor.StepSensorManager
import com.fittrack.companion.sync.FitTrackSyncService
import com.fittrack.companion.sync.StepSyncWorker
import com.fittrack.companion.ui.components.ProgressRing
import com.fittrack.companion.ui.components.StatusCard
import com.fittrack.companion.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

class MainActivity : ComponentActivity() {

    private lateinit var healthConnectManager: HealthConnectManager
    private lateinit var stepSensorManager: StepSensorManager
    private lateinit var syncService: FitTrackSyncService

    // Permission Launchers
    private val healthPermissionLauncher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        checkPermissionsAndRefresh()
    }

    private val activityRecognitionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            stepSensorManager.startListening()
        }
        checkPermissionsAndRefresh()
    }

    // State Holders
    private val todayStepsState = mutableStateOf(0L)
    private val trackingSourceState = mutableStateOf("Initializing...")
    private val healthConnectGrantedState = mutableStateOf(false)
    private val activityRecognitionGrantedState = mutableStateOf(false)
    private val isSyncingState = mutableStateOf(false)
    private val lastSyncTimeState = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        healthConnectManager = HealthConnectManager(this)
        stepSensorManager = StepSensorManager(this)
        syncService = FitTrackSyncService(this)

        // Schedule all-day periodic background sync via WorkManager
        StepSyncWorker.enqueuePeriodicSync(this)

        setContent {
            FitTrackCompanionTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = BackgroundLight
                ) {
                    CompanionScreen(
                        todaySteps = todayStepsState.value,
                        stepGoal = syncService.getStepGoal(),
                        trackingSource = trackingSourceState.value,
                        hasHealthConnect = healthConnectManager.isHealthConnectAvailable(),
                        isHealthConnectGranted = healthConnectGrantedState.value,
                        isActivityRecognitionGranted = activityRecognitionGrantedState.value,
                        hasHardwareSensor = stepSensorManager.isHardwareSensorSupported(),
                        isSyncing = isSyncingState.value,
                        lastSyncTime = lastSyncTimeState.value,
                        serverUrl = syncService.getSyncServerUrl(),
                        syncToken = syncService.getSyncToken(),
                        onRequestHealthConnect = { requestHealthConnectPermissions() },
                        onRequestActivityRecognition = { requestActivityRecognitionPermission() },
                        onSyncNow = { performManualSync() },
                        onSaveSettings = { url, token, goal ->
                            syncService.setSyncServerUrl(url)
                            syncService.setSyncToken(token)
                            syncService.setStepGoal(goal)
                            Toast.makeText(this, "Settings saved!", Toast.LENGTH_SHORT).show()
                        }
                    )
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        checkPermissionsAndRefresh()
    }

    override fun onDestroy() {
        super.onDestroy()
        stepSensorManager.stopListening()
    }

    private fun checkPermissionsAndRefresh() {
        val hasActivityRec = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACTIVITY_RECOGNITION
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
        activityRecognitionGrantedState.value = hasActivityRec

        if (hasActivityRec && stepSensorManager.isHardwareSensorSupported()) {
            stepSensorManager.startListening()
        }

        lastSyncTimeState.value = syncService.getLastSyncTime()

        val coroutineScope = kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Main)
        coroutineScope.launch {
            val hasHcPerm = healthConnectManager.hasAllPermissions()
            healthConnectGrantedState.value = hasHcPerm

            if (hasHcPerm) {
                val aggregatedSteps = healthConnectManager.getAggregatedDailySteps(LocalDate.now())
                todayStepsState.value = aggregatedSteps
                trackingSourceState.value = "Health Connect (Aggregated)"
            } else if (hasActivityRec && stepSensorManager.isHardwareSensorSupported()) {
                val sensorSteps = stepSensorManager.getCachedTodaySteps()
                todayStepsState.value = sensorSteps
                trackingSourceState.value = "Step Sensor (TYPE_STEP_COUNTER)"
            } else {
                todayStepsState.value = 0L
                trackingSourceState.value = "Awaiting Permissions"
            }
        }
    }

    private fun requestHealthConnectPermissions() {
        if (healthConnectManager.isHealthConnectAvailable()) {
            healthPermissionLauncher.launch(healthConnectManager.permissions)
        } else {
            Toast.makeText(this, "Health Connect is not available on this device", Toast.LENGTH_LONG).show()
        }
    }

    private fun requestActivityRecognitionPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            activityRecognitionLauncher.launch(Manifest.permission.ACTIVITY_RECOGNITION)
        }
    }

    private fun performManualSync() {
        val coroutineScope = kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Main)
        isSyncingState.value = true

        coroutineScope.launch {
            try {
                val records = if (healthConnectGrantedState.value) {
                    healthConnectManager.getHistoricalRecords(7)
                } else if (activityRecognitionGrantedState.value && stepSensorManager.isHardwareSensorSupported()) {
                    listOf(
                        com.fittrack.companion.model.DailyStepRecord(
                            date = LocalDate.now().toString(),
                            steps = stepSensorManager.getCachedTodaySteps(),
                            distanceKm = (stepSensorManager.getCachedTodaySteps() * 0.76 / 1000.0 * 100.0).let { Math.round(it) / 100.0 },
                            calories = (stepSensorManager.getCachedTodaySteps() * 0.042).toLong(),
                            activeMinutes = (stepSensorManager.getCachedTodaySteps() / 105).toInt().coerceAtMost(300),
                            source = "sensor"
                        )
                    )
                } else {
                    emptyList()
                }

                if (records.isEmpty()) {
                    Toast.makeText(this@MainActivity, "No step records available to sync. Check permissions.", Toast.LENGTH_LONG).show()
                    isSyncingState.value = false
                    return@launch
                }

                val source = if (healthConnectGrantedState.value) "health_connect" else "sensor"
                val result = syncService.syncRecords(records, source)

                if (result.isSuccess) {
                    lastSyncTimeState.value = syncService.getLastSyncTime()
                    Toast.makeText(this@MainActivity, "Synchronized ${records.size} days of steps with FitTrack!", Toast.LENGTH_LONG).show()
                } else {
                    Toast.makeText(this@MainActivity, "Sync failed: ${result.exceptionOrNull()?.message}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@MainActivity, "Sync error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                isSyncingState.value = false
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CompanionScreen(
    todaySteps: Long,
    stepGoal: Int,
    trackingSource: String,
    hasHealthConnect: Boolean,
    isHealthConnectGranted: Boolean,
    isActivityRecognitionGranted: Boolean,
    hasHardwareSensor: Boolean,
    isSyncing: Boolean,
    lastSyncTime: String?,
    serverUrl: String,
    syncToken: String,
    onRequestHealthConnect: () -> Unit,
    onRequestActivityRecognition: () -> Unit,
    onSyncNow: () -> Unit,
    onSaveSettings: (String, String, Int) -> Unit
) {
    val scrollState = rememberScrollState()
    var showSettingsDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "FitTrack ",
                            fontWeight = FontWeight.ExtraBold,
                            color = Navy900
                        )
                        Text(
                            text = "Companion",
                            fontWeight = FontWeight.Bold,
                            color = Emerald600
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { showSettingsDialog = true }) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Sync Settings",
                            tint = Navy900
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = SurfaceWhite
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(scrollState)
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Source & All-Day Status Badge
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .background(Emerald50, RoundedCornerShape(16.dp))
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(Emerald600, RoundedCornerShape(4.dp))
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = trackingSource,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Emerald700
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Main Circular Progress Ring
            ProgressRing(
                currentSteps = todaySteps,
                stepGoal = stepGoal,
                size = 220.dp
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Sync Now Button
            Button(
                onClick = onSyncNow,
                enabled = !isSyncing,
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Emerald600),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            ) {
                if (isSyncing) {
                    CircularProgressIndicator(
                        color = SurfaceWhite,
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text("Synchronizing with FitTrack...")
                } else {
                    Icon(imageVector = Icons.Default.Sync, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Sync Now to FitTrack Web",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }

            if (lastSyncTime != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Last synced: $lastSyncTime",
                    fontSize = 11.sp,
                    color = Slate500
                )
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Status Section Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Start
            ) {
                Text(
                    text = "TRACKING PROVIDERS & PERMISSIONS",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Slate500,
                    letterSpacing = 0.5.sp
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            // 1. Google Health Connect Card
            StatusCard(
                title = "Google Health Connect",
                statusText = if (isHealthConnectGranted) "Connected" else if (hasHealthConnect) "Permission Needed" else "Unavailable",
                isPositive = isHealthConnectGranted,
                icon = Icons.Default.Favorite,
                description = "Aggregates steps across wearables & phones without double-counting."
            )

            if (!isHealthConnectGranted && hasHealthConnect) {
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedButton(
                    onClick = onRequestHealthConnect,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Grant Health Connect Access", color = Emerald600, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 2. Hardware Step Sensor Card
            StatusCard(
                title = "Hardware Pedometer (TYPE_STEP_COUNTER)",
                statusText = if (isActivityRecognitionGranted && hasHardwareSensor) "Active" else if (hasHardwareSensor) "Permission Needed" else "No Sensor",
                isPositive = isActivityRecognitionGranted && hasHardwareSensor,
                icon = Icons.Default.DirectionsWalk,
                description = "Continuous hardware step counter for all-day local tracking."
            )

            if (!isActivityRecognitionGranted && hasHardwareSensor) {
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedButton(
                    onClick = onRequestActivityRecognition,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Allow Activity Recognition", color = Emerald600, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 3. Pairing Credentials Summary
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Pairing Information",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Navy900
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Token: $syncToken",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Emerald700
                    )
                    Text(
                        text = "Endpoint: $serverUrl",
                        fontSize = 11.sp,
                        color = Slate500,
                        maxLines = 1
                    )
                }
            }
        }
    }

    // Settings Dialog
    if (showSettingsDialog) {
        var tempUrl by remember { mutableStateOf(serverUrl) }
        var tempToken by remember { mutableStateOf(syncToken) }
        var tempGoal by remember { mutableStateOf(stepGoal.toString()) }

        AlertDialog(
            onDismissRequest = { showSettingsDialog = false },
            title = { Text("FitTrack Web Connection Settings", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = tempToken,
                        onValueChange = { tempToken = it.uppercase() },
                        label = { Text("Pairing Token (e.g. FT-7492A1)") },
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = tempUrl,
                        onValueChange = { tempUrl = it },
                        label = { Text("Web Sync Endpoint URL") },
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = tempGoal,
                        onValueChange = { tempGoal = it },
                        label = { Text("Daily Step Target") },
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val parsedGoal = tempGoal.toIntOrNull() ?: 8000
                        onSaveSettings(tempUrl, tempToken, parsedGoal)
                        showSettingsDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Emerald600)
                ) {
                    Text("Save Settings")
                }
            },
            dismissButton = {
                TextButton(onClick = { showSettingsDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
