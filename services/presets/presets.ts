import { Content } from "@/types";
import { ColorAdjustment } from "@/services/commons/types";
import { Observable } from "rxjs/internal/Observable";
import Axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import { BaseServices } from "@/services/commons/base";



export interface PresetServices {
    listPresets(id: string, name: string, adjustments: ColorAdjustment): Observable<Content>;
    createPresets(id: string, name: string, adjustments: ColorAdjustment): Observable<Content>;
    updatePresets(id: string, name: string, adjustments: ColorAdjustment): Observable<Content>;
    deletePresets(id: string): Observable<Content>;
    getPresets(id: string): Observable<Content>;
}