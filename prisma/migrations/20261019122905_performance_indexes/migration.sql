-- CreateIndex
CREATE INDEX "Booking_tenantId_blockedFrom_idx" ON "Booking"("tenantId", "blockedFrom");

-- CreateIndex
CREATE INDEX "Booking_status_startsAt_idx" ON "Booking"("status", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_tenantId_endsAt_idx" ON "Booking"("tenantId", "endsAt");

-- CreateIndex
CREATE INDEX "Notification_status_lockedAt_idx" ON "Notification"("status", "lockedAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");
