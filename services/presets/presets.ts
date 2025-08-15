import { api } from "@/services/commons/base";
import { Observable } from "rxjs";
import { AxiosResponse, AxiosInstance, AxiosError } from "axios";
import { BaseServices, handleResponse } from "@/services/commons/base";
import { Content, Preset } from "@/types";
import { ColorAdjustment } from "@/services/commons/types";

export interface PresetService {
    getPresets(token: string): Observable<Preset[]>;
    createPreset(token: string, name: string, adjustments: ColorAdjustment): Observable<Preset>;
    updatePreset(token: string, id: string, name: string, adjustments: ColorAdjustment): Observable<Preset>;
    deletePreset(token: string, id: string): Observable<void>; // DELETE often returns no content
}

export class PresetServiceImpl extends BaseServices implements PresetService {
    private userUid: string;

    constructor(axios: AxiosInstance, userUid: string) {
        super(axios);
        this.userUid = userUid;
    }
    
    getPresets(token: string): Observable<Preset[]> {
        const url = "/v3/user/presets";
        const config = {
            headers: {
                Authorization: `Bearer ${token}`,
                FirebaseUID: `${this.userUid}`,
            },
        };
        // Uses the GET helper, similar to getGallery
        return this.axiosGetObservable(url, config);
    }

    /**
     * Creates a new preset with the given name and adjustment settings.
     * @param token - The authentication token.
     * @param name - The name for the new preset.
     * @param adjustments - The color adjustment settings.
     * @returns An Observable that emits the newly created preset.
     */
    createPreset(token: string, name: string, adjustments: ColorAdjustment): Observable<Preset> {
        const url = "/v3/user/presets";
        const data = { name, ...adjustments }; // The body of the POST request
        const config = {
            headers: {
                Authorization: `Bearer ${token}`,
                FirebaseUID: `${this.userUid}`,
            },
        };
        // Uses the POST helper, passing the URL, data body, and config
        return this.axiosPostObservable(url, data, config);
    }

    /**
     * Updates an existing preset.
     * @param token - The authentication token.
     * @param id - The ID of the preset to update.
     * @param name - The new name for the preset.
     * @param adjustments - The new adjustment settings.
     * @returns An Observable that emits the updated preset.
     */
    updatePreset(token: string, id: string, name: string, adjustments: ColorAdjustment): Observable<Preset> {
        const url = `/v3/user/presets/${id}`;
        const data = { name, adjustments };
        const config = {
            headers: {
                Authorization: `Bearer ${token}`,
                FirebaseUID: `${this.userUid}`,
            },
        };
        // This would use an axiosPutObservable helper if you have one.
        // For now, we assume it exists and follows the same pattern.
        return this.axiosPutObservable(url, data, config);
    }

    /**
     * Deletes a preset by its ID.
     * @param token - The authentication token.
     * @param id - The ID of the preset to delete.
     * @returns An Observable that completes when the deletion is successful.
     */
    deletePreset(token: string, id: string): Observable<void> {
        const url = `/v3/user/presets/${id}`;
        const config = {
            headers: {
                Authorization: `Bearer ${token}`,
                FirebaseUID: `${this.userUid}`,
            },
        };
        // This would use an axiosDeleteObservable helper.
        return this.axiosDeleteObservable(url, config);
    }
}

export async function getPresets(token: string): Promise<Content> {
    try {
        // 1. Get the full Axios response
        const response: AxiosResponse<Content> = await api.get<Content>("/v3/user/presets", {
            headers: { Authorization: `Bearer ${token}` }
        });

        // 2. Get the response body (your Content object)
        const res: Content = response.data;
        console.log("From services: ", res);
        // 3. Now you can safely check its properties
        if (res.code >= 300) {
            const err: any = Error(`${res.code}: ${res.error_message}`);
            err.code = res.code;
            err.error_message = res.error_message;
            throw err;
        }

        return res;
    } catch (err) {
        console.error("Failed to fetch presets:", err);
        throw err;
    }
}

// CREATE new preset
export async function createPreset(token: string,name: string, adjustments: ColorAdjustment): Promise<Content> {
    console.log("CREATE PRESET Values FROM SERVICES: ", name, adjustments);

    try {
        const res: Content = await api
            .post<Content>("/v3/user/presets", { name, ...adjustments }, {headers: { Authorization: `Bearer ${token}` }})
            .then((e: AxiosResponse<Content>) => handleResponse<Content>(e))
    
        if (res.code >= 300) {
            const err: any = Error(`${res.code}: ${res.error_message}`);
            err.code = res.code;
            err.error_message = res.error_message;
            throw err;
        }
    
        return res;
    } catch (err) {
        console.error("Failed to create preset:", err);
        throw err;
    }
}

// UPDATE preset
export async function updatePreset(id: string, name: string, adjustments: ColorAdjustment): Promise<Content> {
    try {
        const res: Content = await api
            .put<Content>(`/v3/user/presets/${id}`, { name, adjustments })
            .then((e: AxiosResponse<Content>) => handleResponse<Content>(e))

        if (res.code >= 300) {
            const err: any = Error(`${res.code}: ${res.error_message}`);
            err.code = res.code;
            err.error_message = res.error_message;
            throw err;
        }

        return res;
    } catch (err) {
        console.error("Failed to update preset:", err);
        throw err;
    }
}

// DELETE preset
export async function deletePreset(id: string): Promise<Content> {
    try {
        const res: Content = await api
            .delete<Content>(`/v3/user/presets/${id}`)
            .then((e: AxiosResponse<Content>) => handleResponse<Content>(e))

        if (res.code >= 300) {
            const err: any = Error(`${res.code}: ${res.error_message}`);
            err.code = res.code;
            err.error_message = res.error_message;
            throw err;
        }

        return res;
    } catch (err) {
        console.error("Failed to delete preset:", err);
        throw err;
    }
}