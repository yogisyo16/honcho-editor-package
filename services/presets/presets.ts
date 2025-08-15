import { api } from "@/services/commons/base";
import { AxiosResponse } from "axios";
import { handleResponse } from "@/services/commons/base";
import { Content } from "@/types";
import { ColorAdjustment } from "@/services/commons/types";

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
export async function createPreset(name: string, adjustments: ColorAdjustment): Promise<Content> {
    console.log("CREATE PRESET Values FROM SERVICES: ", name, adjustments);
    const requestBody = {
        name,
        ...adjustments
    };

    try {
        const res: Content = await api
            .post<Content>("/v3/presets", requestBody)
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
            .put<Content>(`/v3/presets/${id}`, { name, adjustments })
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
            .delete<Content>(`/v3/presets/${id}`)
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