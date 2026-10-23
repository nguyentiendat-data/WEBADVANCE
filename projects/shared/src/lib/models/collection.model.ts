import type { ProductListItem } from './product.model';

export interface CollectionSummary {
  id: string;
  name: string;
  slug: string;
  slogan: string;
  shortDescription: string;
  thumbnail: string;
}

export interface CollectionHotspot {
  /** Slug sản phẩm để liên kết tới trang chi tiết. */
  slug: string;
  /** Vị trí tương đối trên ảnh, từ 0 đến 1. */
  x: number;
  y: number;
}

export interface CollectionImage {
  id: string;
  url: string;
  title: string;
  description: string;
  hotspots: CollectionHotspot[];
}

export interface CollectionDetail {
  id: string;
  name: string;
  slug: string;
  slogan: string;
  shortDescription: string;
  description: string;
  images: CollectionImage[];
  products: ProductListItem[];
}
