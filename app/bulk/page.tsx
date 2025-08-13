'use client';

import React, { Suspense, useMemo } from "react";
import { Box, Stack, CircularProgress, Typography, Checkbox, Paper } from "@mui/material";
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'; // Magic Wand Icon
import Script from "next/script";
import { ResponseGalleryPaging } from "@/types";
import { GalleryServiceImpl } from "@/services/gallery/gallery";
import { apiV3 } from "@/services/commons/base";
import { firstValueFrom } from "rxjs";
import {
    // Core Hooks - We will use a bulk-specific hook here
    useHonchoEditorBulk, // Assuming you have this hook ready

    // UI Components
    HHeaderEditor,
    HFooter,
    HImageEditorBulkDekstop,
    HImageEditorBulkMobile,
    HBulkAccordionColorAdjustment,
    HBulkPreset,
    HModalEditorDekstop,
    HTextField,
    HPresetOptionsMenu,
    HAlertInternetBox,
    HAlertCopyBox,
    HAlertPresetSave,
    HAlertInternetConnectionBox,
    
    // Theme & Utility Hooks
    useColors,
    useIsMobile
} from '@yogiswara/honcho-editor-ui';

import type {
    Controller,
    AdjustmentState,
    Preset,
} from '@yogiswara/honcho-editor-ui';

declare global {
    interface Window {
        onReceiveToken?: (token: string, firebaseUid: string) => void;
    }
}

if (typeof window !== "undefined") {
    window.onReceiveToken = (token: string, firebaseUid: string) => {
        console.log("[DEBUG] window.onReceiveToken called");
        console.log("Token:", token);
        console.log("firebaseUid:", firebaseUid);
    };
}

const onGetToken = () => new Promise<string>((resolve, reject) => {
    // iOS
    if ((window as any).webkit?.messageHandlers?.nativeHandler) {
        (window as any).webkit.messageHandlers.nativeHandler.postMessage("getToken");
        (window as any).onReceiveToken = (token: string) => {
            resolve(token);
        };
    }
    // Android
    else if ((window as any).Android?.getToken) {
        try {
            const token: string = (window as any).Android.getToken();
            console.log("[onGetToken] Received token from native:", token);
            resolve(token);
        } catch (err) {
            reject("Android getToken failed");
        }
    }
    else {
        reject("Not a mobile environment");
    }
});

// A placeholder controller for bulk-specific actions if needed
const exposeBulkController: Controller = {
    onGetImage: async (firebaseUid: string, imageID: string) => {
        console.debug("on Get Image called: ", imageID);
        const isMobile = !!((window as any).webkit?.messageHandlers?.nativeHandler || (window as any).Android?.getToken);

        if (isMobile) {
            // Get token from native only
            const token = await onGetToken().catch(err => {
                console.error(err);
                // Re-throw a more specific error if token fetching fails
                throw new Error("Failed to get authentication token from native app."); 
            });

            if (!token) {
                throw new Error("Authentication token is missing.");
            }
            // Use GalleryServiceImpl for both web and mobile
            const galleryService = new GalleryServiceImpl(apiV3, firebaseUid);

            try {
                // For mobile: pass token, for web: pass empty string
                const result = await firstValueFrom(galleryService.getImageById(token, imageID));
                if (!result) throw new Error("No gallery found in response");

                return result;
            } catch (err) {
                console.error("onGetImage error:", err);
                // throw new Error("No gallery found in response");
                throw err;
            }
        } else {
            console.warn("failed to get token cause this pc");
            throw new Error("can't call in PC must be in mobile");
        }
    },
    getImageList: async (firebaseUid: string, eventId: string, page: number): Promise<ResponseGalleryPaging> => {
        console.log(`Controller fetching image list for event: ${eventId}, page: ${page}`);
        const isMobile = !!((window as any).webkit?.messageHandlers?.nativeHandler || (window as any).Android?.getToken);
        let token: string;

        // This handles both mobile and web (for testing)
        if (isMobile) {
            token = await onGetToken();
        } else {
            console.warn("WEB TEST MODE: Using dummy token for getImageList.");
            token = "dummyToken"; // Make sure this is a valid token
        }

        if (!token) {
            // We throw an error here so useGallerySwipe can catch it and set its error state.
            throw new Error("Authentication token is missing.");
        }

        const galleryService = new GalleryServiceImpl(apiV3, firebaseUid);
        try {
            // ✅ 1. Use the 'page' parameter that is passed into the function.
            const response = await firstValueFrom(galleryService.getGallery(token, page, eventId));

            // ✅ 2. Return the ENTIRE response object to satisfy the Promise<ResponseGalleryPaging> type.
            return response;
        } catch (err) {
            console.error("Failed to get image list:", err);
            // ✅ 3. Re-throw the error so the useGallerySwipe hook can handle it.
            throw err;
        }
    },
    handleBack: (firebaseUid: string, currentImageId: string) => {
        console.log("FireBaseUid:", firebaseUid, "CurrentImageId:", currentImageId);

        // iOS: Send the image ID as a message
        if ((window as any).webkit?.messageHandlers?.nativeHandler) {
            console.log(`Sending imageId '${currentImageId}' to iOS native handler.`);
            (window as any).webkit.messageHandlers.nativeHandler.postMessage(`goBack_${currentImageId}`);
        } 
        // Android: Call a new, specific function with the image ID
        else if ((window as any).Android?.goBack) {
            console.log(`Sending imageId '${currentImageId}' to Android native handler.`);
            (window as any).Android.goBack(currentImageId);
        }
        else {
            console.log("Standard web browser detected. Navigating back in history.");
            window.history.back();
        }
    },
    syncConfig: async (firebaseUid: string) => {
        console.log("syncConfig called")
    },
    getPresets: async (firebaseUid: string) => {
        console.log("getPresets called")
        return [];
    },
    createPreset: async (firebaseUid: string, name: string, settings: AdjustmentState) => {
        console.log("createPreset called")
        return {} as Preset;
    },
    deletePreset: async (firebaseUid: string, presetId: string) => {
        console.log("deletePreset called")
    },
};
function HImageEditorBulkClient() {
    const editor = exposeBulkController;
}

export default function HImageEditorBulkPage() {
    const colors = useColors();

    const fallbackUI = (
        <Stack sx={{ width: '100%', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'black' }}>
            <CircularProgress sx={{ color: colors.onSurfaceVariant }} />
        </Stack>
    );
    
    return (
        <Suspense fallback={fallbackUI}>
            {/* <HImageEditorBulkClient /> */}
        </Suspense>
    );
}