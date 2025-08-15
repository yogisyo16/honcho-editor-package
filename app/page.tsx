'use client';

import React, { useState, useEffect, useRef, Suspense } from "react";
import { Box, Stack, CircularProgress, Typography, Button } from "@mui/material";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import Script from 'next/script';
import { ResponseGalleryPaging } from "@/types";
import { GalleryServiceImpl } from "@/services/gallery/gallery";
import { apiV3 } from "@/services/commons/base";
import { getPresets, updatePreset, createPreset, deletePreset, PresetServiceImpl } from "@/services/presets/presets";
import { ColorAdjustment } from "@/services/commons/types";
import { firstValueFrom } from "rxjs";
import {
    // Core Hook
    useHonchoEditor,

    // UI Components
    HHeaderEditor,
    HFooter,
    HAccordionColorAdjustment,
    HAccordionPreset,
    HBaseDialog,
    HDialogForPreset,
    HDialogCopy,
    HDialogPreset,
    HImageEditorMobile,
    HImageEditorDesktop,
    HModalEditorDekstop,
    HTextField,
    HWatermarkView,
    HModalMobile,
    HPresetOptionsMenu,
    HAlertInternetBox,
    HAlertCopyBox,
    HAlertPresetSave,
    HAlertInternetConnectionBox,
    usePreset,

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

const mockPresets = [
    {
        id: "678506a9b978174d1e9eba19",
        name: "Preset 202506 - 114",
        is_default: true,
        temperature: 70,
        tint: 20,
        saturation: 20,
        vibrance: 10,
        exposure: 23,
        contrast: -20,
        highlights: 50,
        shadows: 0,
        whites: 30,
        blacks: -20,
        clarity: 0,
        sharpness: 50,
    },
    {
        id: "679506a9b978174d1e9eba20",
        name: "Preset 202506 - 115",
        is_default: true,
        temperature: 70,
        tint: 20,
        saturation: 20,
        vibrance: 10,
        exposure: 23,
        contrast: -20,
        highlights: 50,
        shadows: 0,
        whites: 30,
        blacks: -20,
        clarity: 0,
        sharpness: 50,
    }
];

const mapAdjustmentStateToColorAdjustment = (state: AdjustmentState): ColorAdjustment => {
    return {
        temperature: state.tempScore,
        tint: state.tintScore,
        saturation: state.saturationScore,
        vibrance: state.vibranceScore,
        exposure: state.exposureScore,
        contrast: state.contrastScore,
        highlights: state.highlightsScore,
        shadows: state.shadowsScore,
        whites: state.whitesScore,
        blacks: state.blacksScore,
        clarity: state.clarityScore,
        sharpness: state.sharpnessScore,
    };
};

const isTestMode = typeof window !== "undefined" && !(
    (window as any).webkit?.messageHandlers?.nativeHandler ||
    (window as any).Android?.getToken
);

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
        console.warn("Not a mobile environment — using dummy token for web testing");
        resolve("s7ACwSDsNKRdVGCxVx8Xmt7RvHk1");
    }
});

const exposeController: Controller = {
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
        console.log("syncConfig called");
    },
    getPresets: async (firebaseUid: string): Promise<Preset[]> => {
        console.log("MOBILE DEBUG 4: getPresets function has been entered.");
        const presetService = new PresetServiceImpl(apiV3, firebaseUid); // Assuming you've instantiated this
        try {
            console.log("MOBILE DEBUG 5: Attempting to get token from native app...");
            const token = await onGetToken();
            console.log("MOBILE DEBUG 6: Successfully received token from native app.");
            
            // --- THIS IS THE FIX ---
            // Convert the Observable from the service into a Promise and await its result.
            const res = await firstValueFrom(presetService.getPresets(token));
            
            console.log("Get this res: ", res);
            console.log("MOBILE DEBUG 7: Successfully called the preset API service.");

            // The result 'res' is now the Preset[] array, which matches the expected return type.
            return res;

        } catch (err) {
            console.error("MOBILE DEBUG ERROR: An error occurred in the getPresets controller:", err);
            return []; // Return empty on error
        }
    },

    createPreset: async (firebaseUid: string, name: string, settings: AdjustmentState): Promise<void> => {
        console.log("Calling createPreset service for:", name);
        
        // 1. Instantiate the service, just like in getPresets
        const presetService = new PresetServiceImpl(apiV3, firebaseUid);
        
        // Map the UI state to the format the API expects
        const apiAdjustments = mapAdjustmentStateToColorAdjustment(settings);
        
        try {
            const token = await onGetToken();
            
            // 2. Call the method on the 'presetService' instance and use 'firstValueFrom'
            //    to convert the Observable to a Promise.
            const createdPreset = await firstValueFrom(
                presetService.createPreset(token, name, apiAdjustments)
            );

            console.log("Successfully created preset via API:", createdPreset);
            
            // 3. Since the controller interface expects Promise<void>, we don't return a value.
            //    The operation is considered successful if no error is thrown.
            
        } catch (error) {
            console.error("Failed to create preset via API:", error);
            // Re-throw the error so the calling hook (usePreset) can catch it
            throw error;
        }
    },

    deletePreset: async (firebaseUid: string, presetId: string) => {
        console.log("Deleting preset:", presetId);
        try {
            await deletePreset(presetId);
        } catch (error) {
            console.error("Failed to delete preset via API:", error);
            throw error;
        }
    },
    updatePreset: async (firebaseUid: string, data: Preset): Promise<void> => {
        console.log("Updating preset:", data);

        const apiAdjustments = mapAdjustmentStateToColorAdjustment({
            tempScore: data.temperature,
            tintScore: data.tint,
            saturationScore: data.saturation,
            vibranceScore: data.vibrance,
            exposureScore: data.exposure,
            contrastScore: data.contrast,
            highlightsScore: data.highlights,
            shadowsScore: data.shadows,
            whitesScore: data.whites,
            blacksScore: data.blacks,
            clarityScore: data.clarity,
            sharpnessScore: data.sharpness,
        });

        try {
            const res = await updatePreset(data.id, data.name, apiAdjustments);

            if (res.code === 200) {
                // If the backend returns updated preset
                return res.data?.preset || data;
            }
            throw new Error(`Failed to update preset. Status code: ${res.code}`);
        } catch (error) {
            console.error("Failed to update preset via API:", error);
            throw error;
        }
    },
};

// if (typeof window !== "undefined") {
//     // Give it a unique namespace to avoid polluting global scope
//     (window as any).__presetTest = {
//         getPresets: (uid: string) => exposeController.getPresets(uid),
        
//         createPreset: (uid: string, name: string, adjustments: any) =>
//             exposeController.createPreset(uid, name, adjustments),
        
//         updatePreset: (uid: string, preset: any) =>
//             exposeController.updatePreset(uid, preset),
        
//         deletePreset: (uid: string, id: string) =>
//             exposeController.deletePreset(uid, id),
//     };
//     console.log(
//         "%cPreset API test commands available in console:",
//         "color: lime; font-weight: bold;"
//     );
//     console.log(`__presetTest.getPresets("s7ACwSDsNKRdVGCxVx8Xmt7RvHk1").then(console.log)`);
//     console.log(`__presetTest.createPreset("s7ACwSDsNKRdVGCxVx8Xmt7RvHk1", "My Preset", adjustmentsObject).then(console.log)`);
//     console.log(`__presetTest.updatePreset("s7ACwSDsNKRdVGCxVx8Xmt7RvHk1", presetObject).then(console.log)`);
//     console.log(`__presetTest.deletePreset("s7ACwSDsNKRdVGCxVx8Xmt7RvHk1", "presetId").then(console.log)`);
// }

function HImageEditorClient() {
    // Pass imageId to useHonchoEditor as initialImageId (if your hook supports it)
    const colors = useColors();
    const isMobile = useIsMobile();

    const [isPrevHovered, setIsPrevHovered] = useState(false);
    const [isNextHovered, setIsNextHovered] = useState(false);

    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPressActiveRef = useRef<boolean>(false);

    const [imageId, setimageId] = useState<string>("");
    const [firebaseId, setfirebaseId] = useState<string>("");
    const editor = useHonchoEditor(exposeController, imageId, firebaseId);
    const presetEditor = usePreset(exposeController, firebaseId);

    const handleScale = (event: React.MouseEvent<HTMLElement>) => editor.setAnchorMenuZoom(event.currentTarget);
    const handleBeforeAfter = () => console.log("Before/After toggled!");

    const touchStartX = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        touchStartX.current = e.touches[0].clientX;

        isLongPressActiveRef.current = false; // Reset on new touch

        longPressTimerRef.current = setTimeout(() => {
            editor.handleShowOriginal();
            isLongPressActiveRef.current = true;
        }, 500);
    };

    const handleTouchMove = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }

        // If the long press was activated, show the edited image again and stop.
        if (isLongPressActiveRef.current) {
            editor.handleShowEdited();
            isLongPressActiveRef.current = false;
            return; // Prevents swipe logic from firing
        }

        
        if (touchStartX.current === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const deltaX = touchEndX - touchStartX.current;
        // Threshold for swipe (adjust as needed)
        if (deltaX > 20) {
            // Swipe right: previous image
            editor.onSwipePrev();
        } else if (deltaX < -20) {
            // Swipe left: next image
            editor.onSwipeNext();
        }
        touchStartX.current = null;
    };

    const renderActivePanel = () => {
        // MARK: Dekstop Editor panels
        switch (editor.activePanel) {
            case 'colorAdjustment':
                return (
                    <HAccordionColorAdjustment
                        tempScore={editor.currentAdjustmentsState.tempScore}
                        setTempScore={editor.setTempScore}
                        tintScore={editor.currentAdjustmentsState.tintScore}
                        setTintScore={editor.setTintScore}
                        vibranceScore={editor.currentAdjustmentsState.vibranceScore}
                        setVibranceScore={editor.setVibranceScore}
                        saturationScore={editor.currentAdjustmentsState.saturationScore}
                        setSaturationScore={editor.setSaturationScore}
                        exposureScore={editor.currentAdjustmentsState.exposureScore}
                        setExposureScore={editor.setExposureScore}
                        HighlightsScore={editor.currentAdjustmentsState.highlightsScore}
                        setHighlightsScore={editor.setHighlightsScore}
                        shadowsScore={editor.currentAdjustmentsState.shadowsScore}
                        setShadowsScore={editor.setShadowsScore}
                        whitesScore={editor.currentAdjustmentsState.whitesScore}
                        setWhitesScore={editor.setWhitesScore}
                        blacksScore={editor.currentAdjustmentsState.blacksScore}
                        setBlacksScore={editor.setBlacksScore}
                        contrastScore={editor.currentAdjustmentsState.contrastScore}
                        setContrastScore={editor.setContrastScore}
                        clarityScore={editor.currentAdjustmentsState.clarityScore}
                        setClarityScore={editor.setClarityScore}
                        sharpnessScore={editor.currentAdjustmentsState.sharpnessScore}
                        setSharpnessScore={editor.setSharpnessScore}
                        expandedPanels={editor.colorAdjustmentExpandedPanels}
                        onPanelChange={editor.handleColorAccordionChange}
                    />
                );
            case 'preset':
                return (
                    <HAccordionPreset
                        presets={presetEditor.presets}
                        expandedPanels={editor.presetExpandedPanels}
                        onChange={editor.handlePresetAccordionChange}
                        onOpenPresetModal={editor.handleOpenPresetModal}
                        onOpenWatermarkView={editor.handleOpenWatermarkView}
                        selectedPreset={editor.selectedDesktopPreset}
                        onSelectPreset={editor.handleSelectDesktopPreset}
                        presetMenuAnchorEl={editor.presetMenuAnchorEl}
                        onPresetMenuClick={editor.handlePresetMenuClick}
                        onPresetMenuClose={editor.handlePresetMenuClose}
                        activePresetMenuId={editor.activePresetMenuId}
                        onRemovePreset={editor.handleRemovePreset}
                        onRenamePreset={editor.handleOpenRenameModal}
                        onDeletePreset={() => {
                            if (editor.activePresetMenuId) {
                                presetEditor.actions.delete(editor.activePresetMenuId);
                            }
                        }}
                    />
                );
            default: return null;
        }
    };

    if (editor.isCreatingWatermark) {
        return (
            <HWatermarkView
                onSaveWatermark={editor.handleSaveWatermark}
                onCancelWatermark={editor.handleCancelWatermark}
            />
        );
    }

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const imageIdFromUrl = params.get("imageID");
            const firebaseUidFromUrl = params.get("firebaseUID");
            if (imageIdFromUrl) setimageId(imageIdFromUrl);
            if (firebaseUidFromUrl) setfirebaseId(firebaseUidFromUrl);
        }
    }, []);

    useEffect(() => {
        // If the image is loaded AND our initial load flag is still false...
        if (editor.isImageLoaded && !isInitialLoadComplete) {
            // ...then the initial load is now complete.
            setIsInitialLoadComplete(true);
        }
    }, [editor.isImageLoaded, isInitialLoadComplete]);

    useEffect(() => {
        // We only load if we have a valid firebaseId and the preset hook is ready
        if (presetEditor.actions.load && (firebaseId || isTestMode)) {
            console.log("[usePreset] Triggering load for firebaseId:", firebaseId);
            presetEditor.actions.load();
        }
    }, [firebaseId, presetEditor.actions.load]);

    return (
        <>
            <Script
                src="/honcho-photo-editor.js"
                strategy="lazyOnload"
                onReady={() => {
                    editor.handleScriptReady();
                }}
            />
            <Stack direction="column" justifyContent="center" sx={{ width: '100%', height: isMobile ? '100%' : '100vh', background: 'black', pl: isMobile ? 0 : "24px", pr: isMobile ? 0 : "0px" }}>
                {editor.isConnectionSlow && <HAlertInternetConnectionBox onClose={editor.handleAlertClose} />}
                {!editor.isOnline && <HAlertInternetBox />}
                {editor.isPresetCreated && !isMobile && <HAlertPresetSave />}
                {editor.showCopyAlert && <HAlertCopyBox />}

                <HHeaderEditor
                    onBack={editor.handleBackCallback}
                    onUndo={editor.handleUndo}
                    onRedo={editor.handleRedo}
                    onRevert={editor.handleRevert}
                    onCopyEdit={editor.handleOpenCopyDialog}
                    onPasteEdit={editor.handlePasteEdit}
                    isPasteEnabled={editor.isPasteAvailable}
                    anchorEl={editor.headerMenuAnchorEl}
                    onMenuClick={editor.handleHeaderMenuClick}
                    onMenuClose={editor.handleHeaderMenuClose}
                    // onSelectButton={editor.toggleBulkEditing}
                    // valueSelect={editor.selectedImages}
                />
                <Stack
                    direction={isMobile ? "column" : "row"}
                    justifyContent="space-between"
                    alignItems="stretch"
                    sx={{ width: '100%', flexGrow: 1, overflow: 'hidden' }}
                >
                    {/* Main Canvas Area */}
                    <Box sx={{ 
                        flexGrow: 1,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center', // This will now work correctly on mobile
                        position: 'relative',
                        p: isMobile ? 2 : 4,
                        minHeight: 720
                    }}>

                        {!editor.isImageLoaded ? (
                            <Box onClick={() => editor.fileInputRef.current?.click()} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, cursor: editor.isEditorReady ? 'pointer' : 'default', textAlign: 'center', color: 'grey.500', width: '100%', height: '300px' }}>
                                {!editor.isEditorReady && <CircularProgress color="inherit" sx={{ mb: 2 }} />}
                            </Box>
                        ) : (
                            (
                                // Canvas for Single Edit
                                <Box
                                    sx={{
                                        position: 'relative',
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}>
                                    <canvas
                                        ref={editor.canvasRef}
                                        style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
                                    />
                                    {!isMobile && (
                                        <>
                                            <Button
                                                size="medium"
                                                sx={{
                                                    position: 'absolute',
                                                    top: '50%',
                                                    left: isMobile ? 10 : 200,
                                                    transform: 'translateY(-50%)',
                                                    zIndex: 2,
                                                    minWidth: 0,
                                                    borderRadius: '50%',
                                                    width: 40,
                                                    height: 40,
                                                    padding: 0,
                                                    opacity: isPrevHovered ? 1 : 0, // Only visible on hover
                                                    transition: 'opacity 0.4s',
                                                    backgroundColor: colors.onBackground,
                                                    color: colors.surface,
                                                    '&:hover': {
                                                        backgroundColor: colors.onBackground,
                                                    }
                                                }}
                                                onClick={() => editor.onSwipePrev()}
                                                onMouseEnter={() => setIsPrevHovered(true)}
                                                onMouseLeave={() => setIsPrevHovered(false)}
                                                aria-label="Previous Image"
                                            >
                                                <ArrowBackIosNewIcon fontSize="small" />
                                            </Button>

                                            {/* Next Button */}
                                            <Button
                                                size="medium"
                                                sx={{
                                                    position: 'absolute',
                                                    top: '50%',
                                                    right: isMobile ? 10 : 200,
                                                    transform: 'translateY(-50%)',
                                                    zIndex: 2,
                                                    minWidth: 0,
                                                    borderRadius: '50%',
                                                    width: '48px',
                                                    height: '48px',
                                                    padding: 0,
                                                    opacity: isNextHovered ? 1 : 0, // Only visible on hover
                                                    transition: 'opacity 0.4s',
                                                    backgroundColor: colors.onBackground,
                                                    color: colors.surface,
                                                    '&:hover': {
                                                        backgroundColor: colors.onBackground,
                                                    }
                                                }}
                                                onClick={() => editor.onSwipeNext()}
                                                onMouseEnter={() => setIsNextHovered(true)}
                                                onMouseLeave={() => setIsNextHovered(false)}
                                                aria-label="Next Image"
                                            >
                                                <ArrowForwardIosIcon fontSize="small" />
                                            </Button>
                                            
                                        </>
                                    )}
                                </Box>
                            )
                        )}
                    </Box>

                    {!isMobile && (
                        <HImageEditorDesktop
                            activePanel={editor.activePanel}
                            setActivePanel={editor.setActivePanel}
                            onScale={handleScale}
                            onBeforeAfter={handleBeforeAfter}
                            isPanelOpen={!isMobile}
                            anchorElZoom={editor.anchorMenuZoom}
                            onZoomMenuClose={() => editor.setAnchorMenuZoom(null)}
                            onZoomAction={editor.handleZoomAction}
                            footer={
                                <HFooter
                                    anchorElZoom={editor.anchorMenuZoom}
                                    onScale={(event: React.MouseEvent<HTMLElement>) => editor.setAnchorMenuZoom(event.currentTarget)}
                                    onShowOriginal={editor.handleShowOriginal}
                                    onShowEdited={editor.handleShowEdited}
                                    onZoomMenuClose={() => editor.setAnchorMenuZoom(null)}
                                    onZoomAction={editor.handleZoomAction}
                                    zoomLevelText={editor.zoomLevelText} 
                                />
                            }
                        >
                            {renderActivePanel()}
                        </HImageEditorDesktop>
                    )}
                    
                    {isMobile && (
                        <HImageEditorMobile
                            presets={presetEditor.presets}
                            contentRef={editor.contentRef}
                            panelRef={editor.panelRef}
                            panelHeight={editor.panelHeight}
                            handleDragStart={editor.handleDragStart}
                            onContentHeightChange={editor.handleContentHeightChange}
                            activePanel={editor.activePanel}
                            setActivePanel={(panel) => { editor.setActivePanel(panel); editor.setActiveSubPanel(''); }}
                            activeSubPanel={editor.activeSubPanel}
                            setActiveSubPanel={editor.setActiveSubPanel}
                            
                            // Color Adjustments
                            tempScore={editor.currentAdjustmentsState.tempScore}
                            onTempChange={editor.setTempScore}
                            tintScore={editor.currentAdjustmentsState.tintScore}
                            onTintChange={editor.setTintScore}
                            vibranceScore={editor.currentAdjustmentsState.vibranceScore}
                            onVibranceChange={editor.setVibranceScore}
                            saturationScore={editor.currentAdjustmentsState.saturationScore}
                            onSaturationChange={editor.setSaturationScore}

                            // Adjustments Light
                            exposureScore={editor.currentAdjustmentsState.exposureScore}
                            onExposureChange={editor.setExposureScore}
                            contrastScore={editor.currentAdjustmentsState.contrastScore}
                            onContrastChange={editor.setContrastScore}
                            highlightsScore={editor.currentAdjustmentsState.highlightsScore}
                            onHighlightsChange={editor.setHighlightsScore}
                            shadowScore={editor.currentAdjustmentsState.shadowsScore}
                            onShadowsChange={editor.setShadowsScore}
                            whiteScore={editor.currentAdjustmentsState.whitesScore}
                            onWhitesChange={editor.setWhitesScore}
                            blackScore={editor.currentAdjustmentsState.blacksScore}
                            onBlacksChange={editor.setBlacksScore}

                            // Adjustments Details
                            clarityScore={editor.currentAdjustmentsState.clarityScore}
                            onClarityChange={editor.setClarityScore}
                            sharpnessScore={editor.currentAdjustmentsState.sharpnessScore}
                            onSharpnessChange={editor.setSharpnessScore}
                            
                            // Modal Management
                            onOpenPresetModal={editor.handleOpenPresetModalMobile}
                            presetOptionModal={editor.handlePresetMenuClick}
                            selectedPreset={editor.selectedMobilePreset}
                            onSelectPreset={editor.handleSelectMobilePreset}
                        />
                    )}

                    <HPresetOptionsMenu
                        anchorEl={editor.presetMenuAnchorEl}
                        isOpen={Boolean(editor.presetMenuAnchorEl)}
                        onClose={editor.handlePresetMenuClose}
                        onRename={() => { presetEditor.actions.rename }}
                        onDelete={() => {
                            if (editor.activePresetMenuId) {
                                presetEditor.actions.delete(editor.activePresetMenuId);
                            }
                        }}
                    />
                    <HModalEditorDekstop
                        modalName="preset"
                        modalOpen={editor.isPresetModalOpen}
                        modalTitle="Create Preset"
                        modalInformation="Choose settings to include in preset"
                        action={
                            <HDialogPreset
                                colorChecks={editor.copyColorChecks}
                                lightChecks={editor.copyLightChecks}
                                detailsChecks={editor.copyDetailsChecks}
                                setColorChecks={editor.setCopyColorChecks}
                                setLightChecks={editor.setCopyLightChecks}
                                setDetailsChecks={editor.setCopyDetailsChecks}
                                expanded={editor.copyDialogExpanded}
                                onParentChange={editor.handleCopyParentChange}
                                onChildChange={editor.handleCopyChildChange}
                                onToggleExpand={editor.handleToggleCopyDialogExpand}
                            />
                        }
                        modalClose={editor.handleClosePresetModal}
                        onConfirm={async () => {
                            await presetEditor.actions.create(editor.presetName, editor.currentAdjustmentsState);
                            editor.handleClosePresetModal(); // closes desktop modal
                        }}
                    >
                        <HTextField valueName={editor.presetName} setName={editor.handleNameChange} />
                    </HModalEditorDekstop>
                    <HModalMobile
                        modalName="preset"
                        modalOpen={editor.isPresetModalOpenMobile}
                        modalTitle="Create Preset"
                        modalInformation="Create a preset with the current Light, Colour and Details settings"
                        modalClose={editor.handleClosePresetModalMobile}
                        onConfirm={async () => {
                            await presetEditor.actions.create(editor.presetName, editor.currentAdjustmentsState);
                            editor.handleClosePresetModalMobile(); // closes desktop modal
                        }}
                        action={
                            <HDialogPreset
                                colorChecks={editor.copyColorChecks}
                                lightChecks={editor.copyLightChecks}
                                detailsChecks={editor.copyDetailsChecks}
                                setColorChecks={editor.setCopyColorChecks}
                                setLightChecks={editor.setCopyLightChecks}
                                setDetailsChecks={editor.setCopyDetailsChecks}
                                expanded={editor.copyDialogExpanded}
                                onParentChange={editor.handleCopyParentChange}
                                onChildChange={editor.handleCopyChildChange}
                                onToggleExpand={editor.handleToggleCopyDialogExpand}
                            />
                        }
                    >
                        <HTextField valueName={editor.presetName} setName={editor.handleNameChange} />
                    </HModalMobile>
                </Stack>
            </Stack>

            {editor.isCopyDialogOpen && (
                <HBaseDialog
                    open={editor.isCopyDialogOpen}
                    title="Copy Edits"
                    onClose={editor.handleCloseCopyDialog}
                    action={
                        <HDialogCopy
                            onCopyEdit={editor.handleConfirmCopy}
                
                            colorChecks={editor.copyColorChecks}
                            lightChecks={editor.copyLightChecks}
                            detailsChecks={editor.copyDetailsChecks}
                            
                            setColorChecks={editor.setCopyColorChecks}
                            setLightChecks={editor.setCopyLightChecks}
                            setDetailsChecks={editor.setCopyDetailsChecks}
                            
                            expanded={editor.copyDialogExpanded}
                            
                            onParentChange={editor.handleCopyParentChange}
                            onChildChange={editor.handleCopyChildChange}
                            onToggleExpand={editor.handleToggleCopyDialogExpand}
                        />
                    }
                />
            )}
        </>
    )
}


export default function HImageEditorPage() {
    const colors = useColors();

    const fallbackUI = (
        <Stack sx={{ width: '100%', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'black' }}>
            <CircularProgress sx={{ color: colors.onSurfaceVariant }} />
        </Stack>
    );
    
    return (
        <Suspense fallback={fallbackUI}>
            <HImageEditorClient />
        </Suspense>
    );
}