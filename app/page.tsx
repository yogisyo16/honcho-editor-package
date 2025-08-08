'use client';

import React, { useState, useMemo, useEffect, useRef, Suspense, useCallback } from "react";
import { Box, Stack, CircularProgress, Typography, Checkbox, Paper, Button } from "@mui/material";
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import Script from 'next/script';
import { Gallery } from "@/types";
import { GalleryServiceImpl } from "@/services/gallery/gallery";
import { apiV3 } from "@/services/commons/base";
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
    HImageEditorBulkDekstop,
    HImageEditorBulkMobile,
    HBulkAccordionColorAdjustment,
    HBulkPreset,
    HModalEditorDekstop,
    HTextField,
    HTextFieldRename,
    HWatermarkView,
    HModalMobile,
    HPresetOptionsMenu,
    HAlertInternetBox,
    HAlertCopyBox,
    HAlertPresetSave,
    HAlertInternetConnectionBox,

    // Theme & Utility Hooks
    useColors,
    useHonchoTypography,
    useIsMobile
} from '@yogiswara/honcho-editor-ui';

import type {
    Controller,
    AdjustmentState,
    Preset,
    ImageItem
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

const initialAdjustments: AdjustmentState = {
    tempScore: 0, tintScore: 0, vibranceScore: 0, exposureScore: 0, highlightsScore: 0, shadowsScore: 0,
    whitesScore: 0, blacksScore: 0, saturationScore: 0, contrastScore: 0, clarityScore: 0, sharpnessScore: 0,
};

const hasAdjustments = (state: AdjustmentState): boolean => {
    if (!state) return false;
    return Object.values(state).some(value => value !== 0);
};

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

const exposeController: Controller = {
    onGetImage: async (firebaseUid: string, imageID: string) => {
        console.debug("on Get Image called");
        const isMobile = !!((window as any).webkit?.messageHandlers?.nativeHandler || (window as any).Android?.getToken);

        if (isMobile) {
            // Get token from native only
            const token = await onGetToken().catch(console.error);

            if (!token) {
                throw new Error("token failed to get");
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
                throw new Error("No gallery found in response");
            }
        } else {
            console.warn("failed to get token cause this pc");
            throw new Error("can't call in PC must be in mobile");
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
    getImageList: async (firebaseUid: string) => {
        console.log("getImageList called")
        return [];
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

if (typeof window !== 'undefined') { (window as any).debugController = exposeController; }

function HImageEditorClient() {
    // Pass imageId to useHonchoEditor as initialImageId (if your hook supports it)
    const colors = useColors();
    const isMobile = useIsMobile();
    
    const useControllerRef = useRef<Controller>();

    const [displayedToken, setDisplayedToken] = useState<string | null>(null);
    const [displayedImageId, setDisplayedImageId] = useState<string | null>(null);

    const [imageHistory, setImageHistory] = useState<string[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState<number>(-1);
    const [isPrevHovered, setIsPrevHovered] = useState(false);
    const [isNextHovered, setIsNextHovered] = useState(false);

    // UI for checking
    const [testFirebaseId, setTestFirebaseId] = useState<string>("");
    const [testImageId, setTestImageId] = useState<string>("");
    const [testResult, setTestResult] = useState<string | null>(null);
    const [testLoading, setTestLoading] = useState(false);

    const [imageId, setimageId] = useState<string>("");
    const [firebaseId, setfirebaseId] = useState<string>("");
    const editor = useHonchoEditor(exposeController, imageId, firebaseId);
    const { loadImageFromId, handleBackCallback } = editor || {};

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const imageIdFromUrl = params.get("imageID");
            const firebaseUidFromUrl = params.get("firebaseUID");
            if (imageIdFromUrl) setimageId(imageIdFromUrl);
            if (firebaseUidFromUrl) setfirebaseId(firebaseUidFromUrl);
        }
    }, []);

    // ✅ FIX: Depend on the specific function `loadImageFromId`
    useEffect(() => {
        if (imageId && firebaseId && loadImageFromId) {
            loadImageFromId(firebaseId, imageId);
        }
    }, [imageId, firebaseId, loadImageFromId]);

    // console.log(editor.)

    // Dummy/placeholder handlers that remain in the component
    const handleScale = (event: React.MouseEvent<HTMLElement>) => editor.setAnchorMenuZoom(event.currentTarget);
    const handleBeforeAfter = () => console.log("Before/After toggled!");

    const touchStartX = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (touchStartX.current === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const deltaX = touchEndX - touchStartX.current;
        // Threshold for swipe (adjust as needed)
        if (deltaX > 50) {
            // Swipe right: previous image
            editor.handlePrev(firebaseId);
        } else if (deltaX < -50) {
            // Swipe left: next image
            editor.handleNext(firebaseId);
        }
        touchStartX.current = null;
    };


    const renderActivePanelBulk = () => {
        // MARK: Dekstop Bulk Editor panels
        switch (editor.activePanel) {
            case 'colorAdjustment':
                return (
                    <HBulkAccordionColorAdjustment
                        // Adjustments Colors
                        onTempDecreaseMax={editor.handleBulkTempDecreaseMax}
                        onTempDecrease={editor.handleBulkTempDecrease}
                        onTempIncrease={editor.handleBulkTempIncrease}
                        onTempIncreaseMax={editor.handleBulkTempIncreaseMax}
                        onTintDecreaseMax={editor.handleBulkTintDecreaseMax}
                        onTintDecrease={editor.handleBulkTintDecrease}
                        onTintIncrease={editor.handleBulkTintIncrease}
                        onTintIncreaseMax={editor.handleBulkTintIncreaseMax}
                        onVibranceDecreaseMax={editor.handleBulkVibranceDecreaseMax}
                        onVibranceDecrease={editor.handleBulkVibranceDecrease}
                        onVibranceIncrease={editor.handleBulkVibranceIncrease}
                        onVibranceIncreaseMax={editor.handleBulkVibranceIncreaseMax}
                        onSaturationDecreaseMax={editor.handleBulkSaturationDecreaseMax}
                        onSaturationDecrease={editor.handleBulkSaturationDecrease}
                        onSaturationIncrease={editor.handleBulkSaturationIncrease}
                        onSaturationIncreaseMax={editor.handleBulkSaturationIncreaseMax}
                        // Adjustments Light
                        onExposureDecreaseMax= {editor.handleBulkExposureDecreaseMax}
                        onExposureDecrease= {editor.handleBulkExposureDecrease}
                        onExposureIncrease= {editor.handleBulkExposureIncrease}
                        onExposureIncreaseMax= {editor.handleBulkExposureIncreaseMax}
                        onContrastDecreaseMax= {editor.handleBulkContrastDecreaseMax}
                        onContrastDecrease= {editor.handleBulkContrastDecrease}
                        onContrastIncrease= {editor.handleBulkContrastIncrease}
                        onContrastIncreaseMax= {editor.handleBulkContrastIncreaseMax}
                        onHighlightsDecreaseMax= {editor.handleBulkHighlightsDecreaseMax}
                        onHighlightsDecrease= {editor.handleBulkHighlightsDecrease}
                        onHighlightsIncrease= {editor.handleBulkHighlightsIncrease}
                        onHighlightsIncreaseMax= {editor.handleBulkHighlightsIncreaseMax}
                        onShadowsDecreaseMax= {editor.handleBulkShadowsDecreaseMax}
                        onShadowsDecrease= {editor.handleBulkShadowsDecrease}
                        onShadowsIncrease= {editor.handleBulkShadowsIncrease}
                        onShadowsIncreaseMax= {editor.handleBulkShadowsIncreaseMax}
                        onWhitesDecreaseMax= {editor.handleBulkWhitesDecreaseMax}
                        onWhitesDecrease= {editor.handleBulkWhitesDecrease}
                        onWhitesIncrease= {editor.handleBulkWhitesIncrease}
                        onWhitesIncreaseMax= {editor.handleBulkWhitesIncreaseMax}
                        onBlacksDecreaseMax= {editor.handleBulkBlacksDecreaseMax}
                        onBlacksDecrease= {editor.handleBulkBlacksDecrease}
                        onBlacksIncrease= {editor.handleBulkBlacksIncrease}
                        onBlacksIncreaseMax= {editor.handleBulkBlacksIncreaseMax}
                        // Adjustments Details
                        onClarityDecreaseMax={editor.handleBulkClarityDecreaseMax}
                        onClarityDecrease={editor.handleBulkClarityDecrease}
                        onClarityIncrease={editor.handleBulkClarityIncrease}
                        onClarityIncreaseMax={editor.handleBulkClarityIncreaseMax}
                        onSharpnessDecreaseMax={editor.handleBulkSharpnessDecreaseMax}
                        onSharpnessDecrease={editor.handleBulkSharpnessDecrease}
                        onSharpnessIncrease={editor.handleBulkSharpnessIncrease}
                        onSharpnessIncreaseMax={editor.handleBulkSharpnessIncreaseMax}
                        
                        // Panels Management
                        expandedPanels={editor.colorAdjustmentExpandedPanels}
                        onPanelChange={editor.handleColorAccordionChange}
                    />
                );
            case 'preset':
                return (
                    <HBulkPreset
                        presets={editor.presets}
                        selectedPreset={editor.selectedBulkPreset}
                        onSelectPreset={editor.handleSelectBulkPreset}
                        expandedPanels={editor.presetExpandedPanels}
                        onPanelChange={editor.handlePresetAccordionChange}
                        presetMenuAnchorEl={editor.presetMenuAnchorEl}
                        activePresetMenuId={editor.activePresetMenuId}
                        isMenuOpen={Boolean(editor.presetMenuAnchorEl)}
                        onPresetMenuClick={editor.handlePresetMenuClick}
                        onPresetMenuClose={editor.handlePresetMenuClose}
                        onRemovePreset={editor.handleRemovePreset}
                        onRenamePreset={editor.handleOpenRenameModal}
                        onDeletePreset={editor.handleDeletePreset}
                        onOpenPresetModal={editor.handleOpenPresetModal}
                    />
                );
            default: return null;
        }
    }

    const renderActivePanel = () => {
        // MARK: Dekstop Editor panels
        switch (editor.activePanel) {
            case 'colorAdjustment':
                return (
                    <HAccordionColorAdjustment
                        tempScore={editor.tempScore}
                        setTempScore={editor.setTempScore}
                        tintScore={editor.tintScore}
                        setTintScore={editor.setTintScore}
                        vibranceScore={editor.vibranceScore}
                        setVibranceScore={editor.setVibranceScore}
                        saturationScore={editor.saturationScore}
                        setSaturationScore={editor.setSaturationScore}
                        exposureScore={editor.exposureScore}
                        setExposureScore={editor.setExposureScore}
                        HighlightsScore={editor.highlightsScore}
                        setHighlightsScore={editor.setHighlightsScore}
                        shadowsScore={editor.shadowsScore}
                        setShadowsScore={editor.setShadowsScore}
                        whitesScore={editor.whitesScore}
                        setWhitesScore={editor.setWhitesScore}
                        blacksScore={editor.blacksScore}
                        setBlacksScore={editor.setBlacksScore}
                        contrastScore={editor.contrastScore}
                        setContrastScore={editor.setContrastScore}
                        clarityScore={editor.clarityScore}
                        setClarityScore={editor.setClarityScore}
                        sharpnessScore={editor.sharpnessScore}
                        setSharpnessScore={editor.setSharpnessScore}
                        expandedPanels={editor.colorAdjustmentExpandedPanels}
                        onPanelChange={editor.handleColorAccordionChange}
                    />
                );
            case 'preset':
                return (
                    <HAccordionPreset
                        presets={editor.presets}
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
                        onDeletePreset={editor.handleDeletePreset}
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

                {/* <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'grey.800', borderRadius: 2, background: '#222', mx: 2 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1, color: 'white' }}>
                        Test onGetImage Function
                    </Typography>
                    <Stack spacing={1}>
                        <input
                            type="text"
                            placeholder="Firebase UID"
                            value={testFirebaseId}
                            onChange={e => setTestFirebaseId(e.target.value)}
                            style={{ padding: 8, borderRadius: 4, border: '1px solid #444', background: '#333', color: '#fff' }}
                        />
                        <input
                            type="text"
                            placeholder="Image ID"
                            value={testImageId}
                            onChange={e => setTestImageId(e.target.value)}
                            style={{ padding: 8, borderRadius: 4, border: '1px solid #444', background: '#333', color: '#fff' }}
                        />
                    </Stack>
                    <Button
                        variant="contained"
                        onClick={async () => {
                            setTestLoading(true);
                            setTestResult(null);
                            try {
                                const url = await exposeController.onGetImage(testFirebaseId, testImageId);
                                setTestResult(url ? `✅ Success! URL: ${url}` : '❌ No URL returned.');
                            } catch (err) {
                                setTestResult(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
                            }
                            setTestLoading(false);
                        }}
                        disabled={testLoading || !testFirebaseId || !testImageId}
                        sx={{ mt: 2 }}
                    >
                        {testLoading ? 'Checking...' : 'Check Image'}
                    </Button>
                    {testResult && (
                        <Typography variant="body2" sx={{ mt: 2, color: testResult.startsWith('✅') ? 'lightgreen' : 'red', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {testResult}
                        </Typography>
                    )}
                </Box> */}

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
                    onSelectButton={editor.toggleBulkEditing}
                    valueSelect={editor.selectedImages}
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
                        <input type="file" ref={editor.fileInputRef} onChange={editor.handleFileChange} multiple accept="image/*" style={{ display: 'none' }} />

                        {!editor.isImageLoaded ? (
                            <Box onClick={() => editor.fileInputRef.current?.click()} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed grey', borderRadius: 2, p: 4, cursor: editor.isEditorReady ? 'pointer' : 'default', textAlign: 'center', color: 'grey.500', width: '100%', height: '300px' }}>
                                {!editor.isEditorReady && <CircularProgress color="inherit" sx={{ mb: 2 }} />}
                                <Typography variant="h6">{editor.editorStatus}</Typography>
                            </Box>
                        ) : (
                            editor.isBulkEditing ? (
                                // Responsive Image Grid for Bulk Edit
                                <Box sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    columnGap: 2,    // Keeps your horizontal gap (e.g., 16px if your theme's spacing unit is 8)
                                    rowGap: '5px',   // Keeps your vertical gap (e.g., 16px if your theme's spacing unit is 8)
                                    width: '100%',
                                    maxWidth: '1200px',
                                    p: 1,
                                    height: '100%',
                                    overflowY: 'auto',
                                }}>
                                    {editor.imageList.map(image => {
                                        const imageAdjustments = editor.adjustmentsMap.get(image.id) || initialAdjustments;
                                        const isEdited = hasAdjustments(imageAdjustments);

                                        return (
                                            <Paper
                                                key={image.id}
                                                elevation={3}
                                                sx={{
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    aspectRatio: '1 / 1',
                                                    '& img': {
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        display: 'block',
                                                        transition: 'opacity 0.2s ease-in-out',
                                                        opacity: editor.selectedImageIds.has(image.id) ? 1 : 0.4,
                                                    }
                                                }}
                                            >
                                                <img src={image.url} alt={image.name} />
                                                <Checkbox
                                                    checked={editor.selectedImageIds.has(image.id)}
                                                    onChange={() => editor.handleToggleImageSelection(image.id)}
                                                    sx={{
                                                        position: 'absolute', top: 4, left: 4, color: 'common.white',
                                                        '&.Mui-checked': { color: '#1976d2' },
                                                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.7)' }
                                                    }}
                                                />
                                                {isEdited && (
                                                    <AutoFixHighIcon 
                                                        fontSize="small"
                                                        sx={{ 
                                                            position: 'absolute', 
                                                            bottom: 8, 
                                                            right: 8, 
                                                            color: 'white', 
                                                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                                            borderRadius: '50%',
                                                            padding: '2px'
                                                        }} 
                                                    />
                                                )}
                                            </Paper>
                                        );
                                    })}
                                </Box>
                            ) : (
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
                                                    left: 200,
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
                                                onClick={() => editor.handlePrev(firebaseId)}
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
                                                    right: 200,
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
                                                onClick={() => editor.handleNext(firebaseId)}
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

                    {!isMobile && !editor.isBulkEditing && (
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

                    {!isMobile && editor.isBulkEditing && (
                        <HImageEditorBulkDekstop
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
                            {renderActivePanelBulk()}
                        </HImageEditorBulkDekstop>
                    )}

                    {isMobile && !editor.isBulkEditing && (
                        <HImageEditorMobile
                            presets={editor.presets}
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
                            tempScore={editor.tempScore}
                            onTempChange={editor.setTempScore}
                            tintScore={editor.tintScore}
                            onTintChange={editor.setTintScore}
                            vibranceScore={editor.vibranceScore}
                            onVibranceChange={editor.setVibranceScore}
                            saturationScore={editor.saturationScore}
                            onSaturationChange={editor.setSaturationScore}

                            // Adjustments Light
                            exposureScore={editor.exposureScore}
                            onExposureChange={editor.setExposureScore}
                            contrastScore={editor.contrastScore}
                            onContrastChange={editor.setContrastScore}
                            highlightsScore={editor.highlightsScore}
                            onHighlightsChange={editor.setHighlightsScore}
                            shadowScore={editor.shadowsScore}
                            onShadowsChange={editor.setShadowsScore}
                            whiteScore={editor.whitesScore}
                            onWhitesChange={editor.setWhitesScore}
                            blackScore={editor.blacksScore}
                            onBlacksChange={editor.setBlacksScore}

                            // Adjustments Details
                            clarityScore={editor.clarityScore}
                            onClarityChange={editor.setClarityScore}
                            sharpnessScore={editor.sharpnessScore}
                            onSharpnessChange={editor.setSharpnessScore}
                            
                            // Modal Management
                            onOpenPresetModal={editor.handleOpenPresetModalMobile}
                            presetOptionModal={editor.handlePresetMenuClick}
                            selectedPreset={editor.selectedMobilePreset}
                            onSelectPreset={editor.handleSelectMobilePreset}
                        />
                    )}
                    {isMobile && editor.isBulkEditing && (
                        <HImageEditorBulkMobile
                            presets={editor.presets}
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
                            onTempDecreaseMax={editor.handleBulkTempDecreaseMax}
                            onTempDecrease={editor.handleBulkTempDecrease}
                            onTempIncrease={editor.handleBulkTempIncrease}
                            onTempIncreaseMax={editor.handleBulkTempIncreaseMax}
                            onTintDecreaseMax={editor.handleBulkTintDecreaseMax}
                            onTintDecrease={editor.handleBulkTintDecrease}
                            onTintIncrease={editor.handleBulkTintIncrease}
                            onTintIncreaseMax={editor.handleBulkTintIncreaseMax}
                            onVibranceDecreaseMax={editor.handleBulkVibranceDecreaseMax}
                            onVibranceDecrease={editor.handleBulkVibranceDecrease}
                            onVibranceIncrease={editor.handleBulkVibranceIncrease}
                            onVibranceIncreaseMax={editor.handleBulkVibranceIncreaseMax}
                            onSaturationDecreaseMax={editor.handleBulkSaturationDecreaseMax}
                            onSaturationDecrease={editor.handleBulkSaturationDecrease}
                            onSaturationIncrease={editor.handleBulkSaturationIncrease}
                            onSaturationIncreaseMax={editor.handleBulkSaturationIncreaseMax}
                            // Adjustments Light
                            onExposureDecreaseMax= {editor.handleBulkExposureDecreaseMax}
                            onExposureDecrease= {editor.handleBulkExposureDecrease}
                            onExposureIncrease= {editor.handleBulkExposureIncrease}
                            onExposureIncreaseMax= {editor.handleBulkExposureIncreaseMax}
                            onContrastDecreaseMax= {editor.handleBulkContrastDecreaseMax}
                            onContrastDecrease= {editor.handleBulkContrastDecrease}
                            onContrastIncrease= {editor.handleBulkContrastIncrease}
                            onContrastIncreaseMax= {editor.handleBulkContrastIncreaseMax}
                            onHighlightsDecreaseMax= {editor.handleBulkHighlightsDecreaseMax}
                            onHighlightsDecrease= {editor.handleBulkHighlightsDecrease}
                            onHighlightsIncrease= {editor.handleBulkHighlightsIncrease}
                            onHighlightsIncreaseMax= {editor.handleBulkHighlightsIncreaseMax}
                            onShadowsDecreaseMax= {editor.handleBulkShadowsDecreaseMax}
                            onShadowsDecrease= {editor.handleBulkShadowsDecrease}
                            onShadowsIncrease= {editor.handleBulkShadowsIncrease}
                            onShadowsIncreaseMax= {editor.handleBulkShadowsIncreaseMax}
                            onWhitesDecreaseMax= {editor.handleBulkWhitesDecreaseMax}
                            onWhitesDecrease= {editor.handleBulkWhitesDecrease}
                            onWhitesIncrease= {editor.handleBulkWhitesIncrease}
                            onWhitesIncreaseMax= {editor.handleBulkWhitesIncreaseMax}
                            onBlacksDecreaseMax= {editor.handleBulkBlacksDecreaseMax}
                            onBlacksDecrease= {editor.handleBulkBlacksDecrease}
                            onBlacksIncrease= {editor.handleBulkBlacksIncrease}
                            onBlacksIncreaseMax= {editor.handleBulkBlacksIncreaseMax}
                            // Adjustments Details
                            onClarityDecreaseMax={editor.handleBulkClarityDecreaseMax}
                            onClarityDecrease={editor.handleBulkClarityDecrease}
                            onClarityIncrease={editor.handleBulkClarityIncrease}
                            onClarityIncreaseMax={editor.handleBulkClarityIncreaseMax}
                            onSharpnessDecreaseMax={editor.handleBulkSharpnessDecreaseMax}
                            onSharpnessDecrease={editor.handleBulkSharpnessDecrease}
                            onSharpnessIncrease={editor.handleBulkSharpnessIncrease}
                            onSharpnessIncreaseMax={editor.handleBulkSharpnessIncreaseMax}

                            selectedPresetBulk={editor.selectedBulkPreset}
                            onOpenPresetModalBulk={editor.handleOpenPresetModalMobile}
                            onSelectPresetBulk={editor.handleSelectBulkPreset}
                            onPresetMenuClickBulk={editor.handlePresetMenuClick}
                        />
                    )}

                    <HPresetOptionsMenu
                        anchorEl={editor.presetMenuAnchorEl}
                        isOpen={Boolean(editor.presetMenuAnchorEl)}
                        onClose={editor.handlePresetMenuClose}
                        onRemove={editor.handleRemovePreset}
                        onRename={editor.handleOpenRenameModal}
                        onDelete={editor.handleDeletePreset}
                        isPresetSelected={(editor.isBulkEditing ? editor.selectedBulkPreset : editor.selectedDesktopPreset) === editor.activePresetMenuId}
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
                        onConfirm={editor.handleCreatePreset}
                    >
                        <HTextField valueName={editor.presetName} setName={editor.handleNameChange} />
                    </HModalEditorDekstop>
                    <HModalMobile
                        modalName="preset"
                        modalOpen={editor.isPresetModalOpenMobile}
                        modalTitle="Create Preset"
                        modalInformation="Create a preset with the current Light, Colour and Details settings"
                        modalClose={editor.handleClosePresetModalMobile}
                        onConfirm={editor.handleCreatePresetMobile}
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