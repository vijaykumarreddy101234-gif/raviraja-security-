import React from 'react';
import { X, Printer, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { QrCodeView } from './QrCodeView';
import { getSecuritySettings } from '../../services/storage';
import { calculateTurnaroundDuration } from '../../utils/securityLogic';

interface PrintVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  docNumber: string;
  docType: 'INWARD' | 'OUTWARD' | 'GATE_PASS' | 'VISITOR' | 'RETURN';
  data: any;
}

export const PrintVoucherModal: React.FC<PrintVoucherModalProps> = ({
  isOpen,
  onClose,
  title,
  docNumber,
  docType,
  data,
}) => {
  if (!isOpen || !data) return null;

  const settings = getSecuritySettings();

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Generates a self-contained printable HTML document as download
    const printableElement = document.getElementById('printable-voucher-content');
    if (!printableElement) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${docNumber} - ${settings.companyName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 20px; color: #0f172a; }
          .header p { margin: 4px 0; font-size: 12px; color: #64748b; }
          .badge { display: inline-block; padding: 4px 8px; border: 1px solid #0f172a; font-weight: bold; font-size: 12px; margin-top: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
          th { background: #f1f5f9; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; font-size: 13px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 48px; padding-top: 24px; border-top: 1px dashed #94a3b8; font-size: 12px; }
        </style>
      </head>
      <body>
        ${printableElement.innerHTML}
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docNumber}_Voucher.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const turnaroundDuration = data.entryDate && data.entryTime && data.exitTime
    ? calculateTurnaroundDuration(data.entryDate, data.entryTime, data.exitDate, data.exitTime)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8 print:border-none print:shadow-none print:m-0">
        {/* Modal Actions Bar (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold tracking-wide">Document Preview: {docNumber}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Voucher
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Content */}
        <div id="printable-voucher-content" className="p-8 text-slate-800 text-sm">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div className="text-left">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Security & Vigilance Gate Pass</span>
                <p className="text-xs text-slate-600 font-mono">DOC REF: {docNumber}</p>
                <p className="text-xs text-slate-600">GSTIN: {settings.gstNumber}</p>
              </div>

              <div className="text-center flex-1 px-4">
                <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">{settings.companyName}</h1>
                <p className="text-xs text-slate-600 max-w-xl mx-auto mt-0.5">{settings.plantAddress}</p>
                <div className="inline-block mt-2 px-3 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[11px] font-semibold text-slate-700">
                  ISO 9001:2015 CERTIFIED UPVC PROFILE & POLYMER DIVISION
                </div>
              </div>

              <div className="text-right">
                <QrCodeView value={`RAVIRAJA|${docType}|${docNumber}|${data.date || data.entryDate || ''}`} size={72} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2">
              <div className="text-base font-bold uppercase tracking-wider text-slate-900">
                {title}
              </div>
              <div className="text-xs font-mono text-slate-700 flex flex-wrap items-center gap-3">
                <span>
                  Entry: <strong>{data.entryDate || data.dispatchDate || data.returnDate || data.date}</strong> at{' '}
                  <strong>{data.entryTime || data.dispatchTime || data.returnTime || data.time}</strong>
                </span>
                {data.exitTime && (
                  <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                    Exit: <strong>{data.exitDate || data.entryDate}</strong> at <strong>{data.exitTime}</strong>
                    {turnaroundDuration && <span className="ml-1 text-emerald-700">({turnaroundDuration})</span>}
                  </span>
                )}
                {!data.exitTime && (docType === 'INWARD' || docType === 'VISITOR') && (
                  <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px]">
                    Inside Factory (Active)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 mb-6 text-xs">
            <div>
              <p className="text-slate-500 font-medium">Party / Counterparty Details:</p>
              <p className="text-sm font-bold text-slate-900">
                {data.supplierCompanyName || data.customerCompanyName || data.companyName || data.partyName || 'N/A'}
              </p>
              <p className="text-slate-700">{data.supplierName || data.customerName || data.personName || ''}</p>
              <p className="text-slate-600">{data.supplierAddress || data.customerAddress || data.address || ''}</p>
              <p className="text-slate-600 font-mono">
                Phone: {data.supplierMobileNumber || data.customerMobileNumber || data.mobileNumber || 'N/A'}
              </p>
              {data.gstNumber && <p className="text-slate-600">GST: {data.gstNumber}</p>}
            </div>

            <div>
              <p className="text-slate-500 font-medium">Logistics & Gate Details:</p>
              <div className="grid grid-cols-2 gap-y-1 mt-1 text-slate-700">
                <span className="font-semibold">Vehicle Number:</span>
                <span className="font-mono font-bold text-slate-900">{data.vehicleNumber || 'N/A'}</span>

                <span className="font-semibold">Driver / Visitor:</span>
                <span>{data.driverName || data.personName || data.visitorName || data.securityStaffName || 'N/A'}</span>

                <span className="font-semibold">Contact Phone:</span>
                <span className="font-mono">{data.driverMobileNumber || data.mobileNumber || 'N/A'}</span>

                <span className="font-semibold">Gate Pass No:</span>
                <span className="font-mono font-bold text-emerald-800">{data.gatePassNumber || data.visitorPassNumber || docNumber}</span>

                {data.entryDate && (
                  <>
                    <span className="font-semibold">Gate Entry:</span>
                    <span className="font-mono font-semibold">{data.entryDate} {data.entryTime}</span>
                  </>
                )}

                <span className="font-semibold">Gate Exit:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {data.exitDate && data.exitTime ? `${data.exitDate} ${data.exitTime}` : data.exitTime ? `${data.entryDate || ''} ${data.exitTime}` : 'Inside Factory (Active)'}
                </span>

                {turnaroundDuration && (
                  <>
                    <span className="font-semibold">Total Turnaround:</span>
                    <span className="font-mono font-bold text-emerald-700">{turnaroundDuration}</span>
                  </>
                )}

                {data.salesInvoiceNumber && (
                  <>
                    <span className="font-semibold">Sales Invoice:</span>
                    <span className="font-mono">{data.salesInvoiceNumber}</span>
                  </>
                )}
                {data.originalInvoiceNumber && (
                  <>
                    <span className="font-semibold">Ref Invoice:</span>
                    <span className="font-mono">{data.originalInvoiceNumber}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Materials Table if applicable */}
          {data.materials && data.materials.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Verified Material Particulars</h3>
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-300 uppercase font-semibold">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Material Description</th>
                      <th className="p-2.5">Code / Category</th>
                      <th className="p-2.5">Batch / Lot</th>
                      <th className="p-2.5 text-right">Packages</th>
                      <th className="p-2.5 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.materials.map((mat: any, idx: number) => (
                      <tr key={mat.id || idx}>
                        <td className="p-2.5 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-2.5 font-medium text-slate-900">{mat.materialName}</td>
                        <td className="p-2.5 text-slate-600 font-mono">{mat.materialCode || mat.materialCategory || '-'}</td>
                        <td className="p-2.5 text-slate-700 font-mono">{mat.batchNumber || '-'}</td>
                        <td className="p-2.5 text-right font-mono">{mat.numberOfPackages || '-'}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900 font-mono">
                          {mat.quantityReceived || mat.quantity || mat.returnQuantity} {mat.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
                    <tr>
                      <td colSpan={4} className="p-2.5 text-right text-slate-700 uppercase">
                        Total Verified Quantity:
                      </td>
                      <td className="p-2.5 text-right font-mono">
                        {data.materials.reduce((s: number, m: any) => s + (Number(m.numberOfPackages) || 0), 0) || '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono text-emerald-800 text-sm">
                        {data.actualReceivedQuantity ||
                          data.materials.reduce((s: number, m: any) => s + (Number(m.quantity || m.returnQuantity || m.quantityReceived) || 0), 0)}{' '}
                        {data.materials[0]?.unit || 'Units'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Quantity Verification / Remarks block */}
          {docType === 'INWARD' && (
            <div className="grid grid-cols-4 gap-3 p-3 bg-slate-100 rounded-lg mb-6 text-xs text-center border border-slate-200">
              <div>
                <span className="text-slate-500 block">Invoice Quantity</span>
                <span className="font-bold text-slate-800 text-sm">{data.invoiceQuantity} KG</span>
              </div>
              <div>
                <span className="text-slate-500 block">Actual Received</span>
                <span className="font-bold text-emerald-700 text-sm">{data.actualReceivedQuantity} KG</span>
              </div>
              <div>
                <span className="text-slate-500 block">Shortage</span>
                <span className={`font-bold text-sm ${data.shortageQuantity > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {data.shortageQuantity} KG
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Excess</span>
                <span className={`font-bold text-sm ${data.excessQuantity > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                  {data.excessQuantity} KG
                </span>
              </div>
              <div className="col-span-4 text-left border-t border-slate-200 pt-2 mt-1 text-slate-600 italic">
                Verification Remarks: {data.differenceRemarks || 'All weights verified on main plant weighbridge.'}
              </div>
            </div>
          )}

          {/* Visitor Pass Specific Details */}
          {docType === 'VISITOR' && (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mb-6 text-xs space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold text-amber-900">Visiting Officer / Department:</span>
                  <p className="text-sm font-bold text-slate-900">{data.personToMeet} ({data.department})</p>
                </div>
                <div>
                  <span className="font-semibold text-amber-900">Visitor Classification:</span>
                  <p className="text-sm font-bold text-slate-900">{data.visitorType}</p>
                </div>
                <div>
                  <span className="font-semibold text-amber-900">ID Verification:</span>
                  <p className="text-slate-800">{data.idProofType}: <span className="font-mono">{data.idProofNumber}</span></p>
                </div>
                <div>
                  <span className="font-semibold text-amber-900">Purpose of Factory Visit:</span>
                  <p className="text-slate-800">{data.purposeOfVisit}</p>
                </div>
              </div>
              <div className="border-t border-amber-200 pt-2 text-[11px] text-amber-800">
                Notice: Visitor must wear safety helmet and high-visibility jacket inside manufacturing bays. Photography strictly prohibited.
              </div>
            </div>
          )}

          {/* Signatures & Stamp block */}
          <div className="pt-8 mt-6 border-t border-slate-300">
            <div className="grid grid-cols-4 gap-4 text-center text-xs text-slate-700">
              <div className="border-t border-dashed border-slate-400 pt-2">
                <p className="font-semibold text-slate-900">{data.driverName || data.personName || 'Driver / Carrier'}</p>
                <p className="text-[11px] text-slate-500">Carrier / Deliverer Signature</p>
              </div>

              <div className="border-t border-dashed border-slate-400 pt-2">
                <p className="font-semibold text-slate-900">{data.verifiedBy || data.securityStaffName || 'Security Staff'}</p>
                <p className="text-[11px] text-slate-500">Security Gate Officer</p>
              </div>

              <div className="border-t border-dashed border-slate-400 pt-2">
                <p className="font-semibold text-slate-900">{data.approvedBy || 'Plant Supervisor'}</p>
                <p className="text-[11px] text-slate-500">Supervisor / QC Approval</p>
              </div>

              <div className="border-2 border-emerald-800 p-2 rounded text-emerald-800 text-[11px] font-bold uppercase flex flex-col items-center justify-center">
                <CheckCircle2 className="w-5 h-5 mb-0.5" />
                <span>RAVIRAJA SECURITY</span>
                <span className="text-[9px]">GATE INSPECTION PASSED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
