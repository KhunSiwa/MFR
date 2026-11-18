#pragma once

/**
 * Copy to wifi_config.h (gitignored) and supply local test network values
 * via environment/build defines. Never commit real credentials.
 */
#ifndef MFR_WIFI_SSID
#define MFR_WIFI_SSID "REPLACE_WITH_LOCAL_LAB_SSID"
#endif

#ifndef MFR_WIFI_PASSWORD
#define MFR_WIFI_PASSWORD ""
#endif

#ifndef MFR_BACKEND_HOST
#define MFR_BACKEND_HOST "127.0.0.1"
#endif

#ifndef MFR_BACKEND_PORT
#define MFR_BACKEND_PORT 8000
#endif
