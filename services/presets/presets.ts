import { Content } from "@/types";
import { ColorAdjustment } from "@/services/commons/types";
import { Observable } from "rxjs/internal/Observable";
import Axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import { BaseServices } from "@/services/commons/base";

export interface PresetServices {
    listPresets(): Observable<Content>;
    createPresets(id: string, name: string, adjustments: ColorAdjustment): Observable<Content>;
    updatePresets(id: string, name: string, adjustments: ColorAdjustment): Observable<Content>;
    deletePresets(id: string): Observable<Content>;
    getPresets(id: string): Observable<Content>;
}

export class PresetServicesImpl extends BaseServices implements PresetServices {
    constructor(axios: AxiosInstance) {
        super(axios);
    }

    listPresets(): Observable<Content> {
        // Correctly calls the endpoint with no parameters
        return this.axiosGetObservable(`/api/v3/user/presets`);
    }
    createPresets(id: string, name: string, adjustments: ColorAdjustment): Observable<Content> {
        // The URL should not contain query parameters according to the proposal.
        // The body must be a flat object, combining name and the adjustments.
        const requestBody = {
            name,
            ...adjustments // Spread the properties of adjustments into the main object
        };

        // Note: The 'id' (event_id) parameter is removed from the URL
        // to match the provided API documentation.
        return this.axiosPostObservable(`/api/v3/presets`, requestBody);
    }
    updatePresets(id: string, name: string, adjustments: ColorAdjustment): Observable<Content> {
        return this.axiosPutObservable(`/api/v3/presets/${id}`, { name, adjustments });
    }
    deletePresets(id: string): Observable<Content> {
        return this.axiosDeleteObservable(`/api/v3/presets/${id}`);
    }
    getPresets(id: string): Observable<Content> {
        return this.axiosGetObservable(`/api/v3/presets/${id}`);
    }
}