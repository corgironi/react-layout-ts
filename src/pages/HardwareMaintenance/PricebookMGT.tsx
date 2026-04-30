import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import hw from './HardwareMaintenance.module.css';
import pb from './PricebookMGT.module.css';
import {
  reqpirAdminAPI,
  ReqPirContract,
  ReqPirContractCreateBody,
  ReqPirItem,
  ReqPirItemCreateBody,
} from '../../api/api';

function parseApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (
      data &&
      typeof data === 'object' &&
      'message' in data &&
      typeof (data as { message: unknown }).message === 'string'
    ) {
      return (data as { message: string }).message;
    }
    return error.message || '操作失敗';
  }
  return '操作失敗';
}

type Tab = 'items' | 'contracts';

const emptyItemForm = (): ReqPirItemCreateBody => ({
  item_category: '',
  item_name: '',
  item_type: '',
  device_model: '',
  is_active: true,
});

const emptyContractForm = (): ReqPirContractCreateBody => ({
  hri_id: '',
  hrr_id: '',
  currency: '',
  device_model: '',
  price: 0,
  start_date: '',
  is_active: true,
});

function contractHrrDisplay(c: ReqPirContract): string {
  const v = c.hrr_id ?? c.hrrid;
  return v != null && v !== '' ? String(v) : '—';
}

const PricebookMGT = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('items');

  const [items, setItems] = useState<ReqPirItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState('');

  const [contracts, setContracts] = useState<ReqPirContract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsError, setContractsError] = useState('');
  const [filterHri, setFilterHri] = useState('');
  const [filterHrr, setFilterHrr] = useState('');

  const [itemModal, setItemModal] = useState<null | { mode: 'create' } | { mode: 'edit'; row: ReqPirItem }>(null);
  const [itemForm, setItemForm] = useState<ReqPirItemCreateBody>(() => emptyItemForm());
  const [itemSaving, setItemSaving] = useState(false);
  const [itemModalError, setItemModalError] = useState('');

  const [contractModal, setContractModal] = useState<null | { mode: 'create' } | { mode: 'edit'; row: ReqPirContract }>(
    null,
  );
  const [contractForm, setContractForm] = useState<ReqPirContractCreateBody>(() => emptyContractForm());
  const [contractSaving, setContractSaving] = useState(false);
  const [contractModalError, setContractModalError] = useState('');

  const loadItems = useCallback(async () => {
    setItemsLoading(true);
    setItemsError('');
    try {
      const list = await reqpirAdminAPI.listItems();
      setItems(list);
    } catch (e) {
      setItemsError(parseApiError(e));
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  const loadContracts = useCallback(async () => {
    setContractsLoading(true);
    setContractsError('');
    try {
      const h = filterHri.trim();
      const r = filterHrr.trim();
      const list = await reqpirAdminAPI.listContracts({
        ...(h ? { hri_id: h } : {}),
        ...(r ? { hrr_id: r } : {}),
      });
      setContracts(list);
    } catch (e) {
      setContractsError(parseApiError(e));
      setContracts([]);
    } finally {
      setContractsLoading(false);
    }
  }, [filterHri, filterHrr]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (tab === 'contracts') {
      void loadContracts();
    }
  }, [tab, loadContracts]);

  const openCreateItem = () => {
    setItemForm(emptyItemForm());
    setItemModalError('');
    setItemModal({ mode: 'create' });
  };

  const openEditItem = (row: ReqPirItem) => {
    setItemForm({
      item_category: row.item_category ?? '',
      item_name: row.item_name ?? '',
      item_type: row.item_type ?? '',
      device_model: row.device_model != null ? String(row.device_model) : '',
      is_active: row.is_active !== false,
    });
    setItemModalError('');
    setItemModal({ mode: 'edit', row });
  };

  const closeItemModal = () => {
    if (itemSaving) return;
    setItemModal(null);
  };

  const submitItem = async () => {
    const cat = itemForm.item_category.trim();
    const name = itemForm.item_name.trim();
    const typ = itemForm.item_type.trim();
    if (!cat || !name || !typ) {
      setItemModalError('請填寫 item_category、item_name、item_type');
      return;
    }
    const body: ReqPirItemCreateBody = {
      item_category: cat,
      item_name: name,
      item_type: typ,
      ...(itemForm.device_model?.trim() ? { device_model: itemForm.device_model.trim() } : {}),
      is_active: itemForm.is_active !== false,
    };
    setItemSaving(true);
    setItemModalError('');
    try {
      if (itemModal?.mode === 'create') {
        await reqpirAdminAPI.createItem(body);
      } else if (itemModal?.mode === 'edit') {
        await reqpirAdminAPI.patchItem(itemModal.row.hri_id, body);
      }
      setItemModal(null);
      await loadItems();
    } catch (e) {
      setItemModalError(parseApiError(e));
    } finally {
      setItemSaving(false);
    }
  };

  const deleteItem = async (row: ReqPirItem) => {
    const id = String(row.hri_id);
    if (
      !window.confirm(
        `確定刪除品項 hri_id=${id}？後端會一併刪除同品項之合約。`,
      )
    ) {
      return;
    }
    setItemsError('');
    try {
      await reqpirAdminAPI.deleteItem(row.hri_id);
      await loadItems();
      if (tab === 'contracts') await loadContracts();
    } catch (e) {
      setItemsError(parseApiError(e));
    }
  };

  const openCreateContract = () => {
    setContractForm(emptyContractForm());
    setContractModalError('');
    setContractModal({ mode: 'create' });
  };

  const openEditContract = (row: ReqPirContract) => {
    const hrr = row.hrr_id ?? row.hrrid;
    setContractForm({
      hri_id: row.hri_id,
      hrr_id: hrr != null && hrr !== '' ? String(hrr) : '',
      currency: row.currency ?? '',
      device_model: row.device_model ?? '',
      price: typeof row.price === 'number' ? row.price : Number(row.price) || 0,
      start_date: row.start_date?.slice(0, 10) ?? row.start_date ?? '',
      is_active: row.is_active !== false,
    });
    setContractModalError('');
    setContractModal({ mode: 'edit', row });
  };

  const closeContractModal = () => {
    if (contractSaving) return;
    setContractModal(null);
  };

  const submitContract = async () => {
    if (!contractModal) return;
    const hri = String(contractForm.hri_id).trim();
    const cur = contractForm.currency.trim();
    const dm = contractForm.device_model.trim();
    const sd = contractForm.start_date.trim();
    const pr = Number(contractForm.price);
    const hrrTrim = String(contractForm.hrr_id ?? '').trim();
    if (!hri || !cur || !dm || !sd || Number.isNaN(pr) || pr < 0) {
      setContractModalError('請填寫 hri_id、currency、device_model、price（≥0）、start_date（YYYY-MM-DD）');
      return;
    }
    if (contractModal.mode === 'create' && !hrrTrim) {
      setContractModalError('新增合約請填寫 hrr_id（或後端接受之 hrrid）');
      return;
    }
    setContractSaving(true);
    setContractModalError('');
    try {
      if (contractModal.mode === 'create') {
        const base: ReqPirContractCreateBody = {
          hri_id: hri,
          hrr_id: hrrTrim,
          currency: cur,
          device_model: dm,
          price: pr,
          start_date: sd,
          is_active: contractForm.is_active !== false,
        };
        await reqpirAdminAPI.createContract(base);
      } else {
        const patchBody: Partial<ReqPirContractCreateBody> = {
          currency: cur,
          device_model: dm,
          price: pr,
          start_date: sd,
          is_active: contractForm.is_active !== false,
        };
        if (hrrTrim) patchBody.hrr_id = hrrTrim;
        await reqpirAdminAPI.patchContract(contractModal.row.hrc_id, patchBody);
      }
      setContractModal(null);
      await loadContracts();
    } catch (e) {
      setContractModalError(parseApiError(e));
    } finally {
      setContractSaving(false);
    }
  };

  const deleteContract = async (row: ReqPirContract) => {
    if (!window.confirm(`確定刪除合約 hrc_id=${row.hrc_id}？`)) return;
    setContractsError('');
    try {
      await reqpirAdminAPI.deleteContract(row.hrc_id);
      await loadContracts();
    } catch (e) {
      setContractsError(parseApiError(e));
    }
  };

  return (
    <div className={hw.container}>
      <div className={pb.pageHead}>
        <div className={pb.titleBlock}>
          <h1>ReqPir 後台 — 品目錄與合約價</h1>
          <p className={pb.subtitle}>
            串接 <span className={pb.mono}>GET/POST/PATCH/DELETE /reqpir/items</span> 與{' '}
            <span className={pb.mono}>/reqpir/contracts</span>；與報修前台{' '}
            <span className={pb.mono}>GET /cases/:case_id/reqpir-items</span> 分離。
          </p>
        </div>
        <button type="button" className={hw.loadInfoButton} onClick={() => navigate('/hardware-maintenance')}>
          返回報修管理
        </button>
      </div>

      <div className={pb.tabs}>
        <button
          type="button"
          className={`${pb.tab} ${tab === 'items' ? pb.tabActive : ''}`}
          onClick={() => setTab('items')}
        >
          品目錄（items）
        </button>
        <button
          type="button"
          className={`${pb.tab} ${tab === 'contracts' ? pb.tabActive : ''}`}
          onClick={() => setTab('contracts')}
        >
          合約價（contracts）
        </button>
      </div>

      {tab === 'items' && (
        <section className={hw.repairOrderSection}>
          <div className={hw.sectionHeader}>
            <h2 className={hw.sectionTitle}>品目錄</h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className={hw.loadInfoButton} disabled={itemsLoading} onClick={() => void loadItems()}>
                {itemsLoading ? '載入中…' : '重新載入'}
              </button>
              <button type="button" className={hw.actionButton} onClick={openCreateItem}>
                新增品項
              </button>
            </div>
          </div>
          {itemsError && <p className={hw.errorState}>{itemsError}</p>}
          {itemsLoading && !items.length ? (
            <p className={hw.pageState}>載入中…</p>
          ) : (
            <div className={hw.tableWrapper}>
              <table className={hw.repairTable}>
                <thead>
                  <tr>
                    <th>hri_id</th>
                    <th>item_category</th>
                    <th>item_name</th>
                    <th>item_type</th>
                    <th>device_model</th>
                    <th>is_active</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={hw.emptyCell}>
                        無資料
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr key={String(row.hri_id)}>
                        <td className={pb.mono}>{String(row.hri_id)}</td>
                        <td>{row.item_category}</td>
                        <td>{row.item_name}</td>
                        <td>{row.item_type}</td>
                        <td>{row.device_model ?? '—'}</td>
                        <td>{row.is_active === false ? 'false' : 'true'}</td>
                        <td>
                          <div className={pb.rowActions}>
                            <button type="button" className={pb.btnSm} onClick={() => openEditItem(row)}>
                              編輯
                            </button>
                            <button type="button" className={`${pb.btnSm} ${pb.btnDanger}`} onClick={() => void deleteItem(row)}>
                              刪除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'contracts' && (
        <section className={hw.repairOrderSection}>
          <div className={hw.sectionHeader}>
            <h2 className={hw.sectionTitle}>合約價</h2>
            <button type="button" className={hw.actionButton} onClick={openCreateContract}>
              新增合約
            </button>
          </div>
          <div className={pb.toolbar}>
            <div className={pb.filterGroup}>
              <label htmlFor="pb-filter-hri">Query hri_id</label>
              <input
                id="pb-filter-hri"
                type="text"
                value={filterHri}
                onChange={(e) => setFilterHri(e.target.value)}
                placeholder="可留空表示全部"
              />
            </div>
            <div className={pb.filterGroup}>
              <label htmlFor="pb-filter-hrr">Query hrr_id</label>
              <input
                id="pb-filter-hrr"
                type="text"
                value={filterHrr}
                onChange={(e) => setFilterHrr(e.target.value)}
                placeholder="可留空"
              />
            </div>
            <button type="button" className={hw.loadInfoButton} disabled={contractsLoading} onClick={() => void loadContracts()}>
              {contractsLoading ? '查詢中…' : '套用篩選'}
            </button>
          </div>
          {contractsError && <p className={hw.errorState}>{contractsError}</p>}
          {contractsLoading && !contracts.length ? (
            <p className={hw.pageState}>載入中…</p>
          ) : (
            <div className={hw.tableWrapper}>
              <table className={hw.repairTable}>
                <thead>
                  <tr>
                    <th>hrc_id</th>
                    <th>hri_id</th>
                    <th>hrr_id</th>
                    <th>currency</th>
                    <th>device_model</th>
                    <th>price</th>
                    <th>start_date</th>
                    <th>is_active</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className={hw.emptyCell}>
                        無資料
                      </td>
                    </tr>
                  ) : (
                    contracts.map((row) => (
                      <tr key={String(row.hrc_id)}>
                        <td className={pb.mono}>{String(row.hrc_id)}</td>
                        <td className={pb.mono}>{String(row.hri_id)}</td>
                        <td className={pb.mono}>{contractHrrDisplay(row)}</td>
                        <td>{row.currency}</td>
                        <td>{row.device_model}</td>
                        <td>{row.price}</td>
                        <td>{row.start_date}</td>
                        <td>{row.is_active === false ? 'false' : 'true'}</td>
                        <td>
                          <div className={pb.rowActions}>
                            <button type="button" className={pb.btnSm} onClick={() => openEditContract(row)}>
                              編輯
                            </button>
                            <button
                              type="button"
                              className={`${pb.btnSm} ${pb.btnDanger}`}
                              onClick={() => void deleteContract(row)}
                            >
                              刪除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {itemModal && (
        <div className={hw.modalOverlay} onClick={closeItemModal} role="presentation">
          <div className={hw.modal} onClick={(e) => e.stopPropagation()}>
            <div className={hw.modalHeader}>
              <h3>{itemModal.mode === 'create' ? '新增品項' : `編輯品項（hri_id=${itemModal.row.hri_id}）`}</h3>
              <button type="button" className={hw.closeButton} onClick={closeItemModal} aria-label="關閉" disabled={itemSaving}>
                ×
              </button>
            </div>
            <div className={pb.modalBody}>
              {itemModalError && <p className={hw.errorState}>{itemModalError}</p>}
              <form
                className={hw.modalForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitItem();
                }}
              >
                <div className={hw.formGroup}>
                  <label htmlFor="pb-item-cat">item_category（必填）</label>
                  <input
                    id="pb-item-cat"
                    value={itemForm.item_category}
                    onChange={(e) => setItemForm((f) => ({ ...f, item_category: e.target.value }))}
                    disabled={itemSaving}
                  />
                </div>
                <div className={hw.formGroup}>
                  <label htmlFor="pb-item-name">item_name（必填）</label>
                  <input
                    id="pb-item-name"
                    value={itemForm.item_name}
                    onChange={(e) => setItemForm((f) => ({ ...f, item_name: e.target.value }))}
                    disabled={itemSaving}
                  />
                </div>
                <div className={hw.formGroup}>
                  <label htmlFor="pb-item-type">item_type（必填）</label>
                  <input
                    id="pb-item-type"
                    value={itemForm.item_type}
                    onChange={(e) => setItemForm((f) => ({ ...f, item_type: e.target.value }))}
                    disabled={itemSaving}
                  />
                </div>
                <div className={hw.formGroup}>
                  <label htmlFor="pb-item-dm">device_model（選填）</label>
                  <input
                    id="pb-item-dm"
                    value={itemForm.device_model ?? ''}
                    onChange={(e) => setItemForm((f) => ({ ...f, device_model: e.target.value }))}
                    disabled={itemSaving}
                  />
                </div>
                <div className={hw.formGroup}>
                  <label htmlFor="pb-item-active">
                    <input
                      id="pb-item-active"
                      type="checkbox"
                      checked={itemForm.is_active !== false}
                      onChange={(e) => setItemForm((f) => ({ ...f, is_active: e.target.checked }))}
                      disabled={itemSaving}
                    />{' '}
                    is_active
                  </label>
                </div>
                <div className={hw.modalActions}>
                  <button type="button" className={hw.cancelButton} onClick={closeItemModal} disabled={itemSaving}>
                    取消
                  </button>
                  <button type="submit" className={hw.submitButton} disabled={itemSaving}>
                    {itemSaving ? '送出中…' : '儲存'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {contractModal && (
        <div className={hw.modalOverlay} onClick={closeContractModal} role="presentation">
          <div className={hw.modal} onClick={(e) => e.stopPropagation()}>
            <div className={hw.modalHeader}>
              <h3>
                {contractModal.mode === 'create' ? '新增合約價' : `編輯合約（hrc_id=${contractModal.row.hrc_id}）`}
              </h3>
              <button type="button" className={hw.closeButton} onClick={closeContractModal} aria-label="關閉" disabled={contractSaving}>
                ×
              </button>
            </div>
            <div className={pb.modalBody}>
              {contractModalError && <p className={hw.errorState}>{contractModalError}</p>}
              <form
                className={hw.modalForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitContract();
                }}
              >
                <div className={hw.formGroup}>
                  <label htmlFor="pb-c-hri">hri_id（必填，須為既有品項）</label>
                  <select
                    id="pb-c-hri"
                    value={String(contractForm.hri_id)}
                    onChange={(e) => setContractForm((f) => ({ ...f, hri_id: e.target.value }))}
                    disabled={contractSaving || contractModal.mode === 'edit'}
                  >
                    <option value="">請選擇</option>
                    {items.map((it) => (
                      <option key={String(it.hri_id)} value={String(it.hri_id)}>
                        {String(it.hri_id)} — {it.item_name}
                      </option>
                    ))}
                    {contractModal.mode === 'edit' &&
                      !items.some((it) => String(it.hri_id) === String(contractForm.hri_id)) &&
                      String(contractForm.hri_id) && (
                        <option value={String(contractForm.hri_id)}>
                          {String(contractForm.hri_id)}（目前合約綁定，品項清單無此筆）
                        </option>
                      )}
                  </select>
                  {contractModal.mode === 'edit' && (
                    <span className={hw.pageState} style={{ marginTop: '0.5rem', display: 'block', fontSize: '0.75rem' }}>
                      編輯時 hri_id 鎖定；若需改品項請刪除後重建。
                    </span>
                  )}
                </div>
                <div className={hw.formGroup}>
                  <label htmlFor="pb-c-hrr">hrr_id（必填，可填識別碼字串）</label>
                  <input
                    id="pb-c-hrr"
                    type="text"
                    value={String(contractForm.hrr_id ?? '')}
                    onChange={(e) => setContractForm((f) => ({ ...f, hrr_id: e.target.value }))}
                    disabled={contractSaving}
                  />
                </div>
                <div className={hw.formGroup}>
                  <label htmlFor="pb-c-cur">currency（必填）</label>
                  <input
                    id="pb-c-cur"
                    type="text"
                    value={contractForm.currency}
                    onChange={(e) => setContractForm((f) => ({ ...f, currency: e.target.value }))}
                    disabled={contractSaving}
                    placeholder="例：TWD"
                  />
                </div>
                <div className={hw.formGroup}>
                  <label htmlFor="pb-c-dm">device_model（必填）</label>
                  <input
                    id="pb-c-dm"
                    type="text"
                    value={contractForm.device_model}
                    onChange={(e) => setContractForm((f) => ({ ...f, device_model: e.target.value }))}
                    disabled={contractSaving}
                  />
                </div>
                <div className={hw.formGroup}>
                  <label htmlFor="pb-c-price">price（必填，≥0）</label>
                  <input
                    id="pb-c-price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={Number.isNaN(contractForm.price) ? '' : contractForm.price}
                    onChange={(e) =>
                      setContractForm((f) => ({ ...f, price: e.target.value === '' ? NaN : Number(e.target.value) }))
                    }
                    disabled={contractSaving}
                  />
                </div>
                <div className={hw.formGroup}>
                  <label htmlFor="pb-c-sd">start_date（必填，YYYY-MM-DD）</label>
                  <input
                    id="pb-c-sd"
                    type="date"
                    value={contractForm.start_date}
                    onChange={(e) => setContractForm((f) => ({ ...f, start_date: e.target.value }))}
                    disabled={contractSaving}
                  />
                </div>
                <div className={hw.formGroup}>
                  <label htmlFor="pb-c-active">
                    <input
                      id="pb-c-active"
                      type="checkbox"
                      checked={contractForm.is_active !== false}
                      onChange={(e) => setContractForm((f) => ({ ...f, is_active: e.target.checked }))}
                      disabled={contractSaving}
                    />{' '}
                    is_active
                  </label>
                </div>
                <div className={hw.modalActions}>
                  <button type="button" className={hw.cancelButton} onClick={closeContractModal} disabled={contractSaving}>
                    取消
                  </button>
                  <button type="submit" className={hw.submitButton} disabled={contractSaving}>
                    {contractSaving ? '送出中…' : '儲存'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricebookMGT;
