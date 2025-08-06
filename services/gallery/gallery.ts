import { Observable } from "rxjs/internal/Observable";
import {
	ResponseGalleryPaging,
	Gallery,
	GalleryFaceRecognition,
	GalleryFaceRecognitionUpdate, GetRefreshedGalleryResponse
} from "@/services/commons/types";
import { AxiosInstance } from "axios";
import { BaseServices } from "@/services/commons/base";

export interface GalleryService {
	getGallery(token: string, page: number, eventId: String): Observable<ResponseGalleryPaging>;
	getGalleryByShareId(shareId: string): Observable<Gallery[]>;
	// getSlideShow(page: number, eventId: String): Observable<ResponseGalleryPaging>;
	// getSharedGalleryImages(eventId: String, gallery: string[]): Observable<string>;
	// getGalleryByDeepfacePhoto(eventId: string, content: File): Observable<GalleryFaceRecognition>;
	// getRefreshedGallery(eventId: string): Observable<GetRefreshedGalleryResponse>;
	// getSelfieUpdate(fetchUrl: string): Observable<GalleryFaceRecognitionUpdate>;
	// subscribeToFaceRecognitionUpdate(eventID: string, faceId: string, email: string): Observable<string>;
	// subscribeToFaceRecognitionUpdateWithPhone(eventID: string, faceId: string, phone: string): Observable<string>;
}

export class GalleryServiceImpl extends BaseServices implements GalleryService {
    private userUid: string;

    constructor(axios: AxiosInstance, userUid: string) {
        super(axios);
        this.userUid = userUid;
    }
    
    getGallery(token: string, page: number, eventId: String): Observable<ResponseGalleryPaging> {
		const url = "/public/gallery/pagination";
		const params = { token: token, page: page, event_id: eventId };
		return this.axiosGetObservable(url, { params: params, headers: { Authorization: `Bearer ${token}`, FirebaseUID: `${this.userUid}` } });
	}

    getGalleryByShareId(shareId: string): Observable<Gallery[]> {
		const url = `/public/share/ids`;
		const params = { id: shareId };
		return this.axiosGetObservable<Gallery[]>(url, { params });
	}
}