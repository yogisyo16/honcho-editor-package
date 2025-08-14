'use client';

import React, { Suspense, useMemo, useState, useEffect, useCallback } from "react";
import { Box, Stack, CircularProgress, Typography, Checkbox, Paper } from "@mui/material";
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'; // Magic Wand Icon
import Script from "next/script";
import { ResponseGalleryPaging, Gallery, Content } from "@/types";
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
    HDialogPreset,
    HPresetOptionsMenu,
    HAlertInternetBox,
    HAlertCopyBox,
    HAlertPresetSave,
    HAlertInternetConnectionBox,
    AlbumImageGallery,
    EditorProvider,
    
    // Theme & Utility Hooks
    useColors,
    useIsMobile,
    useHonchoEditor,
} from '@yogiswara/honcho-editor-ui';

import type {
    Controller,
    AdjustmentState,
    Preset,
    PhotoData,
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
    handleBack: (firebaseUid: string, lastImageID: string) => {
        console.log("FireBaseUid:", firebaseUid, "lastImageID:", lastImageID);

        // iOS: Send the image ID as a message
        if ((window as any).webkit?.messageHandlers?.nativeHandler) {
            console.log(`Sending imageId '${lastImageID}' to iOS native handler.`);
            (window as any).webkit.messageHandlers.nativeHandler.postMessage(`goBack_${lastImageID}`);
        } 
        // Android: Call a new, specific function with the image ID
        else if ((window as any).Android?.goBack) {
            console.log(`Sending imageId '${lastImageID}' to Android native handler.`);
            (window as any).Android.goBack(lastImageID);
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
    const [imageId, setimageId] = useState<string>("");
    const [eventId, setEventId] = useState<string>("");
    const [firebaseId, setfirebaseId] = useState<string>("");
    const editor = useHonchoEditorBulk(exposeBulkController, eventId, firebaseId);
    const editor2 = useHonchoEditor(exposeBulkController, imageId, firebaseId);
    const [isSelectedMode, setIsSelectedMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isMobile = useIsMobile();
    const colors = useColors();

    const handleScale = (event: React.MouseEvent<HTMLElement>) => editor2.setAnchorMenuZoom(event.currentTarget);
    const handleBeforeAfter = () => console.log("Before/After toggled!");
    const renderActivePanelBulk = () => {
        switch (editor2.activePanel) {
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
                        expandedPanels={editor2.colorAdjustmentExpandedPanels}
                        onPanelChange={editor2.handleColorAccordionChange}
                    />
                );
            case 'preset':
                return (
                    <HBulkPreset
                        presets={editor2.presets}
                        selectedPreset={editor.selectedBulkPreset}
                        onSelectPreset={editor.handleSelectBulkPreset}
                        expandedPanels={editor2.presetExpandedPanels}
                        onPanelChange={editor2.handlePresetAccordionChange}
                        presetMenuAnchorEl={editor2.presetMenuAnchorEl}
                        activePresetMenuId={editor2.activePresetMenuId}
                        isMenuOpen={Boolean(editor2.presetMenuAnchorEl)}
                        onPresetMenuClick={editor2.handlePresetMenuClick}
                        onPresetMenuClose={editor2.handlePresetMenuClose}
                        onRemovePreset={editor2.handleRemovePreset}
                        onRenamePreset={editor2.handleOpenRenameModal}
                        onDeletePreset={editor2.handleDeletePreset}
                        onOpenPresetModal={editor2.handleOpenPresetModal}
                    />
                );
            default: return null;
        }
    };

    const handleToggleSelect = (photo: PhotoData) => {
        editor.handleToggleImageSelection(photo.key);
    }  

    // Effect to get URL params
    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const eventIdUrl = params.get("eventID");
            const firebaseUidFromUrl = params.get("firebaseUID");
            if (eventIdUrl) setEventId(eventIdUrl);
            if (firebaseUidFromUrl) setfirebaseId(firebaseUidFromUrl);
            console.log("Event ID:", eventIdUrl, "FirebaseUID: ",firebaseUidFromUrl);
        }
    }, []);

    return (
        <>
            <Script
                src="/honcho-photo-editor.js"
                strategy="lazyOnload"
                onReady={() => {
                    editor2.handleScriptReady();
                }}
            />
            <Stack direction="column" justifyContent="center" sx={{ width: '100%', height: isMobile ? '100%' : '100vh', background: 'black', pl: isMobile ? 0 : "24px", pr: isMobile ? 0 : "0px" }}>
                {/* Alerts remain the same */}
                {editor2.isConnectionSlow && <HAlertInternetConnectionBox onClose={editor2.handleAlertClose} />}
                {!editor2.isOnline && <HAlertInternetBox />}
                {editor2.isPresetCreated && !isMobile && <HAlertPresetSave />}
                {editor2.showCopyAlert && <HAlertCopyBox />}

                <HHeaderEditor
                    onBack={editor.handleBackCallbackBulk}
                    onUndo={editor2.handleUndo}
                    onRedo={editor2.handleRedo}
                    onRevert={editor2.handleRevert}
                    onCopyEdit={editor2.handleOpenCopyDialog}
                    onPasteEdit={editor2.handlePasteEdit}
                    isPasteEnabled={editor2.isPasteAvailable}
                    anchorEl={editor2.headerMenuAnchorEl}
                    onMenuClick={editor2.handleHeaderMenuClick}
                    onMenuClose={editor2.handleHeaderMenuClose}
                />
                <Stack
                    direction={isMobile ? "column" : "row"}
                    justifyContent="space-between"
                    alignItems="stretch"
                    sx={{ width: '100%', flexGrow: 1, overflow: isMobile ? 'auto' : 'hidden' }}
                >
                    <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2, height: '100%', width: '100%' }}>
                        {editor.isLoading ? (
                            <CircularProgress sx={{ color: colors.onSurfaceVariant }} />
                        ) : editor.error ? (
                            <Typography color="error">{editor.error}</Typography>
                        ) : editor.imageData.length === 0 ? (
                            <Typography sx={{ color: colors.onSurfaceVariant }}>
                                No images found in this gallery.
                            </Typography>
                        ) : (
                            // --- THESE LINES NOW WORK PERFECTLY ---
                            <AlbumImageGallery
                                imageCollection={editor.imageData}
                                onToggleSelect={handleToggleSelect}/>
                        )}
                    </Box>

                    {/* Desktop UI: Bulk Editor Sidebar */}
                    {!isMobile && (
                        <HImageEditorBulkDekstop
                            activePanel={editor2.activePanel}
                            setActivePanel={editor2.setActivePanel}
                            onScale={handleScale}
                            onBeforeAfter={handleBeforeAfter}
                            isPanelOpen={!isMobile}
                            anchorElZoom={editor2.anchorMenuZoom}
                            onZoomMenuClose={() => editor2.setAnchorMenuZoom(null)}
                            onZoomAction={editor2.handleZoomAction}
                            footer={
                                <HFooter
                                    anchorElZoom={editor2.anchorMenuZoom}
                                    onScale={(event: React.MouseEvent<HTMLElement>) => editor2.setAnchorMenuZoom(event.currentTarget)}
                                    onShowOriginal={editor2.handleShowOriginal}
                                    onShowEdited={editor2.handleShowEdited}
                                    onZoomMenuClose={() => editor2.setAnchorMenuZoom(null)}
                                    onZoomAction={editor2.handleZoomAction}
                                    zoomLevelText={editor2.zoomLevelText} 
                                />
                            }
                        >
                            {renderActivePanelBulk()}
                        </HImageEditorBulkDekstop>
                    )}

                    {/* Mobile UI: Bulk Editor Draggable Panel */}
                    {isMobile && (
                        <HImageEditorBulkMobile
                            presets={editor2.presets}
                            contentRef={editor2.contentRef}
                            panelRef={editor2.panelRef}
                            panelHeight={editor2.panelHeight}
                            handleDragStart={editor2.handleDragStart}
                            onContentHeightChange={editor2.handleContentHeightChange}
                            activePanel={editor2.activePanel}
                            setActivePanel={(panel) => { editor2.setActivePanel(panel); editor2.setActiveSubPanel(''); }}
                            activeSubPanel={editor2.activeSubPanel}
                            setActiveSubPanel={editor2.setActiveSubPanel}
                            
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
                            onOpenPresetModalBulk={editor2.handleOpenPresetModalMobile}
                            onSelectPresetBulk={editor.handleSelectBulkPreset}
                            onPresetMenuClickBulk={editor2.handlePresetMenuClick}
                        />
                    )}

                    {/* Shared Modals and Menus */}
                    <HPresetOptionsMenu
                        anchorEl={editor2.presetMenuAnchorEl}
                        isOpen={Boolean(editor2.presetMenuAnchorEl)}
                        onClose={editor2.handlePresetMenuClose}
                        onRemove={editor2.handleRemovePreset}
                        onRename={editor2.handleOpenRenameModal}
                        onDelete={editor2.handleDeletePreset}
                    />
                    <HModalEditorDekstop
                        modalName="preset"
                        modalOpen={editor2.isPresetModalOpen}
                        modalTitle="Create Preset"
                        modalInformation="Choose settings to include in preset"
                        action={
                            <HDialogPreset
                                colorChecks={editor2.copyColorChecks}
                                lightChecks={editor2.copyLightChecks}
                                detailsChecks={editor2.copyDetailsChecks}
                                setColorChecks={editor2.setCopyColorChecks}
                                setLightChecks={editor2.setCopyLightChecks}
                                setDetailsChecks={editor2.setCopyDetailsChecks}
                                expanded={editor2.copyDialogExpanded}
                                onParentChange={editor2.handleCopyParentChange}
                                onChildChange={editor2.handleCopyChildChange}
                                onToggleExpand={editor2.handleToggleCopyDialogExpand}
                            />
                        }
                        modalClose={editor2.handleClosePresetModal}
                        onConfirm={editor2.handleCreatePreset}
                    >
                        <HTextField valueName={editor2.presetName} setName={editor2.handleNameChange} />
                    </HModalEditorDekstop>
                </Stack>
            </Stack>
        </>
    )
}

export default function HImageEditorBulkPage() {
    const colors = useColors();

    const fallbackUI = (
        <Stack sx={{ width: '100%', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'black' }}>
            <CircularProgress sx={{ color: colors.onSurfaceVariant }} />
        </Stack>
    );
    
    return (
        <EditorProvider>
            <Suspense fallback={fallbackUI}>
                <HImageEditorBulkClient />
            </Suspense>
        </EditorProvider>
    );
}