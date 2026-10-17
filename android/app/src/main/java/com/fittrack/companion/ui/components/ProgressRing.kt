package com.fittrack.companion.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fittrack.companion.ui.theme.Emerald500
import com.fittrack.companion.ui.theme.Emerald600
import com.fittrack.companion.ui.theme.Navy900
import com.fittrack.companion.ui.theme.Slate200
import com.fittrack.companion.ui.theme.Slate500
import java.text.NumberFormat
import java.util.Locale

@Composable
fun ProgressRing(
    currentSteps: Long,
    stepGoal: Int,
    size: Dp = 210.dp,
    strokeWidth: Dp = 16.dp,
    modifier: Modifier = Modifier
) {
    val percentage = if (stepGoal > 0) {
        (currentSteps.toFloat() / stepGoal.toFloat()).coerceIn(0f, 1f)
    } else 0f

    val animatedSweep by animateFloatAsState(
        targetValue = percentage * 360f,
        animationSpec = tween(durationMillis = 1000),
        label = "ProgressRingAnimation"
    )

    val formattedSteps = NumberFormat.getNumberInstance(Locale.US).format(currentSteps)
    val formattedGoal = NumberFormat.getNumberInstance(Locale.US).format(stepGoal)
    val percentText = (percentage * 100).toInt()

    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier.size(size)
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val strokePx = strokeWidth.toPx()

            // Background Track
            drawArc(
                color = Slate200,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                style = Stroke(width = strokePx, cap = StrokeCap.Round)
            )

            // Animated Gradient Progress Arc
            if (animatedSweep > 0f) {
                drawArc(
                    brush = Brush.sweepGradient(
                        colors = listOf(Emerald500, Emerald600, Emerald500)
                    ),
                    startAngle = -90f,
                    sweepAngle = animatedSweep,
                    useCenter = false,
                    style = Stroke(width = strokePx, cap = StrokeCap.Round)
                )
            }
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = formattedSteps,
                fontSize = 32.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Navy900
            )
            Text(
                text = "STEPS",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = Slate500,
                letterSpacing = 1.sp
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Goal: $formattedGoal ($percentText%)",
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = Emerald600
            )
        }
    }
}
