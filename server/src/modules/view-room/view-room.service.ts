import { Types } from 'mongoose';
import { AppError } from '../../utils/app-error.js';
import { toObjectId } from '../../utils/object-id.js';
import { CategoryModel } from '../categories/category.model.js';
import { buildListItems, type ProductListItem } from '../products/product.service.js';
import { ProductModel } from '../products/product.model.js';
import type { LayoutInput, SuggestionInput } from './view-room.schema.js';
import { ViewRoomLayoutModel, type ViewRoomLayoutDoc } from './view-room.model.js';

const SIMILAR_LIMIT = 8;
const MISSING_PER_GROUP = 12;

export interface MissingGroup {
  category: { id: string; name: string };
  products: ProductListItem[];
}

export interface RoomSuggestions {
  similar: ProductListItem[];
  missing: MissingGroup[];
}

/**
 * FR-23: "tương tự" là sản phẩm cùng loại sản phẩm với đồ đã đặt; "còn thiếu" là các nhóm
 * trong `typicalCategoryIds` của loại phòng mà chưa có đồ nào được đặt.
 * `roomSize` nhận sẵn nhưng chưa dùng để lọc, vì sản phẩm chưa có kích thước đầy đủ.
 */
export async function getRoomSuggestions(input: SuggestionInput): Promise<RoomSuggestions> {
  const room = await CategoryModel.findOne({
    _id: toObjectId(input.roomCategoryId),
    type: 'ROOM',
    status: 'VISIBLE',
  }).lean();
  if (!room) throw new AppError('NOT_FOUND', 404, 'Không tìm thấy loại phòng');

  const placedIds = input.placedProductIds.map((id) => new Types.ObjectId(id));
  const placed = placedIds.length
    ? await ProductModel.find({ _id: { $in: placedIds }, status: 'ACTIVE' }).lean()
    : [];
  const excludeIds = placed.map((p) => p._id);

  const placedCategoryIds = [...new Set(placed.flatMap((p) => p.categoryIds.map(String)))].map(
    (id) => new Types.ObjectId(id),
  );
  const placedProductCategories = placedCategoryIds.length
    ? await CategoryModel.find(
        { _id: { $in: placedCategoryIds }, type: 'PRODUCT_CATEGORY' },
        { _id: 1 },
      ).lean()
    : [];
  const productCategoryIds = placedProductCategories.map((c) => c._id);

  const similarDocs = productCategoryIds.length
    ? await ProductModel.find({
        status: 'ACTIVE',
        _id: { $nin: excludeIds },
        categoryIds: { $in: productCategoryIds },
      })
        .sort({ listedAt: -1 })
        .limit(SIMILAR_LIMIT)
        .lean()
    : [];

  const coveredIds = new Set(productCategoryIds.map(String));
  const missingCategories = await CategoryModel.find({
    _id: { $in: room.typicalCategoryIds.filter((id) => !coveredIds.has(id.toString())) },
    type: 'PRODUCT_CATEGORY',
    status: 'VISIBLE',
  }).lean();

  // Chỉ gợi ý sản phẩm vừa thuộc nhóm còn thiếu vừa thuộc đúng loại phòng đang chọn.
  const missing = await Promise.all(
    missingCategories.map(async (category) => {
      const docs = await ProductModel.find({
        status: 'ACTIVE',
        _id: { $nin: excludeIds },
        categoryIds: { $all: [category._id, room._id] },
      })
        .sort({ listedAt: -1 })
        .limit(MISSING_PER_GROUP)
        .lean();
      return {
        category: { id: category._id.toString(), name: category.name },
        products: await buildListItems(docs),
      };
    }),
  );

  return {
    similar: await buildListItems(similarDocs),
    missing: missing.filter((group) => group.products.length > 0),
  };
}

export interface LayoutDto {
  id: string;
  name: string;
  room: ViewRoomLayoutDoc['room'];
  items: { productId: string; x: number; z: number; rotationY: number }[];
  updatedAt: Date;
}

function toLayoutDto(doc: ViewRoomLayoutDoc): LayoutDto {
  return {
    id: doc._id.toString(),
    name: doc.name,
    room: doc.room,
    items: doc.items.map((item) => ({
      productId: item.productId.toString(),
      x: item.x,
      z: item.z,
      rotationY: item.rotationY,
    })),
    updatedAt: doc.updatedAt,
  };
}

export async function listLayouts(userId: string): Promise<LayoutDto[]> {
  const docs = await ViewRoomLayoutModel.find({ userId: toObjectId(userId) })
    .sort({ updatedAt: -1 })
    .lean();
  return docs.map(toLayoutDto);
}

export async function createLayout(userId: string, input: LayoutInput): Promise<LayoutDto> {
  const productIds = [...new Set(input.items.map((item) => item.productId))];
  if (productIds.length > 0) {
    const available = await ProductModel.countDocuments({
      _id: { $in: productIds.map((id) => new Types.ObjectId(id)) },
      status: 'ACTIVE',
    });
    if (available !== productIds.length) {
      throw new AppError('VALIDATION_ERROR', 400, 'Có sản phẩm không còn bán');
    }
  }

  const doc = await ViewRoomLayoutModel.create({
    userId: toObjectId(userId),
    name: input.name,
    room: input.room,
    items: input.items.map((item) => ({
      productId: new Types.ObjectId(item.productId),
      x: item.x,
      z: item.z,
      rotationY: item.rotationY,
    })),
  });
  return toLayoutDto(doc.toObject());
}

export async function deleteLayout(userId: string, id: string): Promise<void> {
  const result = await ViewRoomLayoutModel.deleteOne({
    _id: toObjectId(id),
    userId: toObjectId(userId),
  });
  if (result.deletedCount === 0) throw new AppError('NOT_FOUND', 404, 'Không tìm thấy bố cục');
}
