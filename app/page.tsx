'use client';

import React, { useState, useMemo, useEffect, useRef, Suspense  } from "react";
import { Box, Stack, CircularProgress, Typography, Checkbox, Paper } from "@mui/material";
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import Script from 'next/script';
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

const initialAdjustments: AdjustmentState = {
    tempScore: 0, tintScore: 0, vibranceScore: 0, exposureScore: 0, highlightsScore: 0, shadowsScore: 0,
    whitesScore: 0, blacksScore: 0, saturationScore: 0, contrastScore: 0, clarityScore: 0, sharpnessScore: 0,
};

const nativeCallbacks = new Map<string, { resolve: (value: string) => void; reject: (reason?: any) => void }>();

function handleNativeImageResponse(callbackId: string, base64Data: string | null, error: string | null) {
    if (nativeCallbacks.has(callbackId)) {
        const { resolve, reject } = nativeCallbacks.get(callbackId)!;
        if (error) {
            reject(new Error(error));
        } else if (base64Data) {
            const dataUrl = `data:image/jpeg;base64,${base64Data}`;
            resolve(dataUrl);
        } else {
            reject(new Error('Native side returned no data.'));
        }
        nativeCallbacks.delete(callbackId);
    }
}

// Expose the handler on the window object
if (typeof window !== 'undefined') {
    (window as any).handleNativeImageResponse = handleNativeImageResponse;
}

// Helper to check if an image has any edits
const hasAdjustments = (state: AdjustmentState): boolean => {
    if (!state) return false;
    return Object.values(state).some(value => value !== 0);
};

const exposeController: Controller = {
    onGetImage: async (imageID: string) => {
        console.log(`[JS Bridge] Requesting image with ID: ${imageID}`);
        
        const iOSBridge = (window as any).webkit?.messageHandlers?.nativeHandler;
        const androidBridge = (window as any).Android;

        // NATIVE ANDROID LOGIC
        if (androidBridge) {
            console.log("Android environment detected. Calling getImageForEditing().");
            return new Promise((resolve, reject) => {
                const callbackId = `cb_${Date.now()}`;
                nativeCallbacks.set(callbackId, { resolve, reject });
                androidBridge.getImageForEditing(imageID, callbackId, null);
            });
        } 
        // NATIVE IOS LOGIC
        else if (iOSBridge) {
            console.log("iOS environment detected. Posting message to nativeHandler.");
            return new Promise((resolve, reject) => {
                const callbackId = `cb_${Date.now()}`;
                nativeCallbacks.set(callbackId, { resolve, reject });
                const message = { action: 'getImage', imageId: imageID, callbackId: callbackId };
                iOSBridge.postMessage(message);
            });
        } 
        // WEB FALLBACK LOGIC
        else {
            console.warn("Native bridge not found. Using development fallback URL.");
            const imageUrl = `https://d2cxumz3vt1s04.cloudfront.net/staging/gallery-photo/67ee6b55b8e4273707f68978/preview/${imageID}.jpeg`;
            return imageUrl;
        }
    },

    handleBack: () => {
        if ((window as any).webkit?.messageHandlers?.nativeHandler) {
            (window as any).webkit.messageHandlers.nativeHandler.postMessage("back");
            console.log("Sent 'back' message to iOS native handler.");
        } 
        else if ((window as any).Android?.goBack) {
            console.log("Android environment detected. Calling goBack().");
            (window as any).Android.goBack();
        }
        else {
            console.log("Standard web browser detected. Navigating back in history.");
            window.history.back();
        }
    },
    // They must provide placeholder or real implementations for all methods
    getImageList: async () => { return []; },
    syncConfig: async () => {},
    getPresets: async () => { return []; },
    createPreset: async () => { return null; },
    deletePreset: async () => {},
    renamePreset: async () => {},
};

function HImageEditorClient() {
    // 3. The hook is called with the app-specific controller.
    // The 'editor' object now contains ALL state and handlers.
    const editor = useHonchoEditor(exposeController);
    const isMobile = useIsMobile();
    
    const [displayedToken, setDisplayedToken] = useState<string | null>(null);
    const [displayedImageId, setDisplayedImageId] = useState<string | null>(null);

    // Dummy/placeholder handlers that remain in the component
    const handleScale = (event: React.MouseEvent<HTMLElement>) => editor.setAnchorMenuZoom(event.currentTarget);
    const handleBeforeAfter = () => console.log("Before/After toggled!");
    // const handleZoomMenuClose = () => editor.setAnchorMenuZoom(null);
    // const handleZoomAction = (level: string) => { console.log(`Zoom: ${level}`); handleZoomMenuClose(); };

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
                {displayedToken && (
                    <Box sx={{ p: 1, mx: 2, backgroundColor: 'grey.900', borderRadius: 1, mt: 1 }}>
                        <Typography variant="caption" sx={{ color: 'lime', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            <strong>Token Received:</strong> {displayedToken}
                        </Typography>
                    </Box>
                )}
                {displayedImageId && (
                    <Box sx={{ p: 1, mx: 2, backgroundColor: 'grey.900', borderRadius: 1, mt: 1 }}>
                        <Typography variant="caption" sx={{ color: 'white', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            <strong>Image ID:</strong> {displayedImageId}
                        </Typography>
                    </Box>
                )}

                <HHeaderEditor
                    onBack={editor.handleBack}
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
                                <canvas ref={editor.canvasRef} style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }} />
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