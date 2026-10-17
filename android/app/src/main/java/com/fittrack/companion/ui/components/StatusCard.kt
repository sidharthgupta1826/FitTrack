package com.fittrack.companion.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fittrack.companion.ui.theme.Emerald600
import com.fittrack.companion.ui.theme.Navy900
import com.fittrack.companion.ui.theme.Slate100
import com.fittrack.companion.ui.theme.Slate200
import com.fittrack.companion.ui.theme.Slate500
import com.fittrack.companion.ui.theme.SurfaceWhite

@Composable
fun StatusCard(
    title: String,
    statusText: String,
    isPositive: Boolean,
    icon: ImageVector,
    description: String? = null,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(SurfaceWhite, RoundedCornerShape(20.dp))
            .border(1.dp, Slate200, RoundedCornerShape(20.dp))
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(42.dp)
                .background(
                    if (isPositive) Color(0xFFECFDF5) else Slate100,
                    RoundedCornerShape(12.dp)
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (isPositive) Emerald600 else Slate500,
                modifier = Modifier.size(22.dp)
            )
        }

        Spacer(modifier = Modifier.width(14.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = Navy900
            )
            if (description != null) {
                Text(
                    text = description,
                    fontSize = 11.sp,
                    color = Slate500,
                    lineHeight = 14.sp
                )
            }
        }

        Box(
            modifier = Modifier
                .background(
                    if (isPositive) Color(0xFFD1FAE5) else Color(0xFFF1F5F9),
                    RoundedCornerShape(12.dp)
                )
                .padding(horizontal = 10.dp, vertical = 4.dp)
        ) {
            Text(
                text = statusText,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = if (isPositive) Emerald600 else Slate500
            )
        }
    }
}
