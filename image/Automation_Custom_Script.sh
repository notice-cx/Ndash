#!/bin/sh
# NdashOS image build, inside the build VM: DietPi runs this at the end of its unattended
# first run. It installs the NdashOS layer from the build's layer disk, then reboots once into
# the finished system, where ndash-bake-finalize checks it, cleans it up and powers off.
set -eu

LAYER_DISK=/dev/disk/by-id/ata-QEMU_HARDDISK_NDASHLAYER
OUT=/boot/efi/ndash-bake

# Any failure stops the build fast, with DietPi's logs, instead of leaving it to time out.
on_exit() {
    status=$?
    if [ "$status" -ne 0 ]; then
        mkdir -p "$OUT/logs"
        echo "failed: Automation_Custom_Script.sh exited with $status" > "$OUT/result"
        cp -r /var/lib/dietpi/logs/. "$OUT/logs/" 2>/dev/null || true
        systemctl poweroff
    fi
}
trap on_exit EXIT

mkdir -p /opt/ndash
tar -C /opt/ndash -xf "$LAYER_DISK"

# The image targets Intel mini PCs whatever CPU the build machine has.
NDASH_PLATFORM=intel /opt/ndash/install.sh

install -m 755 /opt/ndash/bake/finalize.sh /usr/local/lib/ndash/bake-finalize.sh
install -m 644 /opt/ndash/bake/ndash-bake-finalize.service /etc/systemd/system/
rm -r /opt/ndash/bake
systemctl daemon-reload
systemctl enable ndash-bake-finalize.service

# DietPi finishes its first run within seconds of this script; a minute is ample.
systemd-run --on-active=60 --unit=ndash-bake-reboot systemctl reboot
