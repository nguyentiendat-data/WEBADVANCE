import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiErrorMessage } from '../../../../core/api-error';
import { ConfirmService } from '../../../../core/confirm/confirm.service';
import { AccountApiService, type AccountAddress, type AddressInput } from '../../account-api.service';
import { AccountIconComponent } from '../../account-icon.component';
import { ToastService } from '../../../../core/toast/toast.service';

@Component({
  selector: 'app-addresses',
  imports: [FormsModule, AccountIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './addresses.component.html',
  styleUrl: './addresses.component.css',
})
export class AddressesComponent {
  private readonly api = inject(AccountApiService);
  private readonly confirm = inject(ConfirmService);

  protected readonly addresses = signal<AccountAddress[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');
  protected readonly notice = signal<{ text: string; error: boolean } | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly editingAddressId = signal('');
  protected readonly editingDefault = signal(false);
  protected form: Required<AddressInput> = this.emptyAddress();

  constructor() {
    this.loadAddresses();
  }

  protected openForm(address?: AccountAddress): void {
    this.editingAddressId.set(address?.id ?? '');
    this.editingDefault.set(address?.isDefault ?? false);
    this.form = address
      ? {
          recipientName: address.recipientName,
          recipientPhone: address.recipientPhone,
          addressLine: address.addressLine,
          ward: address.ward,
          district: address.district ?? '',
          province: address.province,
          isDefault: address.isDefault,
        }
      : { ...this.emptyAddress(), isDefault: this.addresses().length === 0 };
    this.formOpen.set(true);
    this.notice.set(null);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingAddressId.set('');
  }

  protected saveAddress(): void {
    if (this.saving()) return;
    const required = [this.form.recipientName, this.form.recipientPhone, this.form.addressLine, this.form.ward, this.form.province];
    if (required.some((value) => !value.trim())) {
      return this.showNotice('Vui lòng nhập đầy đủ các trường bắt buộc (*).', true);
    }
    const phone = this.form.recipientPhone.replace(/[\s.-]/g, '');
    if (!/^(0|\+84)\d{9}$/.test(phone)) {
      return this.showNotice('Số điện thoại cần 10 số, bắt đầu bằng 0.', true);
    }

    const body: AddressInput = {
      ...this.form,
      recipientPhone: phone,
      district: this.form.district.trim() || undefined,
    };
    const id = this.editingAddressId();
    this.saving.set(true);
    (id ? this.api.updateAddress(id, body) : this.api.createAddress(body)).subscribe({
      next: () => {
        this.saving.set(false);
        this.showNotice(id ? 'Đã cập nhật địa chỉ.' : 'Đã thêm địa chỉ mới.');
        this.closeForm();
        this.loadAddresses();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.showNotice(apiErrorMessage(error), true);
      },
    });
  }

  protected async deleteAddress(): Promise<void> {
    const id = this.editingAddressId();
    if (!id) return;
    const ok = await this.confirm.ask({
      title: 'Xoá địa chỉ',
      message: 'Bạn chắc chắn muốn xoá địa chỉ này?',
      confirmText: 'Xoá',
    });
    if (!ok) return;
    this.saving.set(true);
    this.api.deleteAddress(id).subscribe({
      next: () => {
        this.saving.set(false);
        this.showNotice('Đã xoá địa chỉ.');
        this.closeForm();
        this.loadAddresses();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.showNotice(apiErrorMessage(error), true);
      },
    });
  }

  protected formatAddress(address: AccountAddress): string {
    return [address.addressLine, address.ward, address.district, address.province].filter(Boolean).join(', ');
  }

  private loadAddresses(): void {
    this.loading.set(true);
    this.api.addresses().subscribe({
      next: (addresses) => {
        this.addresses.set(addresses);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  private readonly toast = inject(ToastService);

  /** Thành công hiện toast ở đầu trang rồi tự mất; lỗi vẫn giữ lại trên trang. */
  private showNotice(text: string, error = false): void {
    if (error) {
      this.notice.set({ text, error });
      return;
    }
    this.notice.set(null);
    this.toast.success(text);
  }

  private emptyAddress(): Required<AddressInput> {
    return { recipientName: '', recipientPhone: '', addressLine: '', ward: '', district: '', province: '', isDefault: false };
  }
}
