import { ProductInterface } from '@/interfaces/ProductInterface';

const plain = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const matchesSearch = (product: ProductInterface, search: string): boolean => plain(product.name).includes(plain(search));
