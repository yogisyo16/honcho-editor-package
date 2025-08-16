import { api, handleResponse, BaseServices  } from "@/services/commons/base";
import { HistoryEditorConfigResponse } from "@/services/commons/types";
import { Observable } from "rxjs";
import type { AxiosInstance } from "axios";

export interface HistoryService {
    submitHistory(token: string, data: HistoryEditorConfigResponse): Observable<HistoryEditorConfigResponse>;
    getHistory(token: string, eventId: string): Observable<HistoryEditorConfigResponse>;
    setHistory(token: string, data: HistoryEditorConfigResponse): Observable<HistoryEditorConfigResponse>;
    getModifiedTimestamp(token: string, eventId: string): Observable<HistoryEditorConfigResponse>;
}

export class HistoryServiceImpl extends BaseServices implements HistoryService {
    private userUid: string;

    constructor(axios: AxiosInstance, userUid: string) {
        super(axios);
        this.userUid = userUid;
    }

    getHistory(token: string, eventId: string): Observable<HistoryEditorConfigResponse> {
        const url = "/v3/image-editor/action-history"; 

        const config = {
            params: { 
                event_id: eventId 
            },
            headers: {
                Authorization: `Bearer ${token}`,
                FirebaseUID: `${this.userUid}`,
            },
        };
        
        return this.axiosGetObservable<HistoryEditorConfigResponse>(url, config);
    }

    submitHistory(token: string, data: HistoryEditorConfigResponse): Observable<HistoryEditorConfigResponse> {
        const url = "/v3/image-editor/action"; 
        const config = {
            headers: {
                Authorization: `Bearer ${token}`,
                FirebaseUID: `${this.userUid}`,
            },
        };
        
        return this.axiosPostObservable<HistoryEditorConfigResponse>(url, data, config);
    }

    setHistory(token: string, data: HistoryEditorConfigResponse): Observable<HistoryEditorConfigResponse> {
        const url = "/v3/image-editor/set-history-index"; 
        const config = {
            headers: {
                Authorization: `Bearer ${token}`,
                FirebaseUID: `${this.userUid}`,
            },
        };
        
        return this.axiosPutObservable<HistoryEditorConfigResponse>(url, data, config);
    }

    getModifiedTimestamp(token: string, eventId: string): Observable<HistoryEditorConfigResponse> {
        const url = "/v3/image-editor/last-edit"; 
        const config = {
            params: { 
                event_id: eventId 
            },
            headers: {
                Authorization: `Bearer ${token}`,
                FirebaseUID: `${this.userUid}`,
            },
        };
        
        return this.axiosGetObservable<HistoryEditorConfigResponse>(url, config);
    }
}