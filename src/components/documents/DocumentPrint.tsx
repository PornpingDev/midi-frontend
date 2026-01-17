// src/components/documents/DocumentPrint.tsx
import React from "react";
 

/** ---------- Types ---------- */
export type DocItem = {
  product_no?: string;
  name?: string;
  description?: string;
  unit?: string;
  quantity?: number;
  unit_price?: number;
  line_amount?: number;
};

export type Party = {
  name?: string | null;
  address?: string | null;
  tax_id?: string | null;
  email?: string | null;
  phone?: string | null;
  customer_no?: string | null; // NEW
  supplier_code?: string | null; // ✅ ADD
};

export type Totals = {
  subtotal?: number;
  vat_rate?: number;
  vat_amount?: number;
  grand_total?: number;
};

export type PrintDoc = {
  ok: boolean;
  form: "A" | "B" | "QUOTATION" | "PO";
  header_title: string;
  header_labels?: string[];
  display_no: string;
  doc_status?: "APPROVED" | "DRAFT" | "VOID" | "REPRINT";
  customer?: Party;
  party?: Party;
  sales_order_no?: string | null;
  po_number?: string | null;
  po_numbers?: string[]; // NEW: รองรับหลายเลข
  bill_ref_no?: string | null;
  document_no: string;
  document_set_note?: string | null; // NEW: “เอกสารออกเป็นชุด”
  job_no?: string | null; // NEW
  document_date?: string;
  doc_date_dmy?: string;
  doc_date_th?: string;
  remark?: string | null;
  totals: Totals;
  items: DocItem[];
};










/** ---------- Helpers ---------- */
const fmt = (n?: number) =>
  typeof n === "number" && !isNaN(n)
    ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";

const todayDMY = (d?: string) => {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x.getTime())) return "";
  const dd = String(x.getDate()).padStart(2, "0");
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const yy = String(x.getFullYear());
  return `${dd}/${mm}/${yy}`;
};

function thBahtText(amount?: number): string {
  if (amount == null || isNaN(amount)) return "ศูนย์บาทถ้วน";
  const s = Number(amount).toFixed(2);
  const [i, f] = s.split(".");
  const n = (t: string) => t.replace(/^0+/, "") || "0";
  const u = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
  const d = ["ศูนย์","หนึ่ง","สอง","สาม","สี่","ห้า","หก","เจ็ด","แปด","เก้า"];
  const read = (str: string) => {
    let out = "";
    for (let k = 0; k < str.length; k++) {
      const num = +str[k], pos = str.length - k - 1;
      if (!num) continue;
      if (pos === 0) out += (num === 1 && str.length > 1) ? "เอ็ด" : d[num];
      else if (pos === 1) out += num === 1 ? "สิบ" : num === 2 ? "ยี่สิบ" : d[num] + "สิบ";
      else out += d[num] + u[pos];
    }
    return out;
  };
  const million = (x: string): string => {
    const m = /(\d{1,6})(\d{6})$/.exec(x);
    if (!m) return read(x);
    const head = read(m[1]);
    const tail = million(m[2]);
    return (head ? head + "ล้าน" : "ล้าน") + tail;
  };
  const intPart = n(i);
  const decPart = +f;
  const intText = +intPart === 0 ? "ศูนย์" : million(intPart);
  return intText + "บาท" + (decPart === 0 ? "ถ้วน" : read(String(decPart)) + "สตางค์");
}



/** ---------- Print constants (ข้อ 3) ---------- */
const BORDER_W = 1;          // ✅ ความหนาเส้นมาตรฐาน (ปรับได้จุดเดียว)
const PAD_X = 6;             // ✅ padding ซ้าย/ขวา มาตรฐาน
const PAD_Y = 4;             // ✅ padding บน/ล่าง มาตรฐาน
const BORDER = `${BORDER_W}px solid #000`;


/** ---------- Layout helpers ---------- */
const Row: React.FC<
  React.PropsWithChildren<{ gap?: number } & React.HTMLAttributes<HTMLDivElement>>
> = ({ gap = 8, children, style, ...rest }) => (
  <div style={{ display: "flex", gap, width: "100%", ...style }} {...rest}>
    {children}
  </div>
);
const Col: React.FC<React.PropsWithChildren<{ w?: string | number }>> = ({ w, children }) => (
  <div style={{ flex: w ? "0 0 auto" : "1 1 0", width: w }}>{children}</div>
);
const Cell: React.FC<React.PropsWithChildren<{ align?: "left" | "center" | "right"; b?: boolean }>> = ({
  align = "left",
  b = false,
  children
}) => (
  <div
    style={{
      padding: `${PAD_Y}px ${PAD_X}px`,
      textAlign: align,
      fontWeight: b ? 700 : 400
    }}
  >
    {children}
  </div>
);


/** ---------- Pieces ---------- */
const CompanyHead: React.FC<{ layout: any }> = ({ layout }) => {
  // ===== read from JSON with safe fallbacks =====
  const hc = layout?.header_company ?? {};
  const cb = hc.company_block ?? {};
  const lx = hc.layout ?? {};
  const tx = hc.texts ?? {};

  const logoText  = typeof hc.logo_text === "string" ? hc.logo_text : "MIDI";
  const logoPx    = Number(hc.logo_px)    || 72;
  const taglinePx = Number(hc.tagline_px) || 24;
  const taglineTxt = hc.tagline_text ?? "Engineering and Equipment"; 

  const gapPx       = Number(lx.gap_px)                || 16;
  const minRightW   = Number(lx.right_min_width)       || 420;
  const maxRightW   = Number(lx.right_max_width)       || 520;
  const rightPadTop = Number(lx.right_padding_top_px)  || 6;
  const topOffset   = Number(lx.top_offset_px)        || 0;

  const thBoldPx = Number(cb.th_bold_px)  || 21;
  const enBoldPx = Number(cb.en_bold_px)  || 18;
  const addrThPx = Number(cb.addr_th_px)  || 17;
  const addrEnPx = Number(cb.addr_en_px)  || 17;
  const telPx    = Number(cb.tel_px)      || 17; 

  return (
    <div style={{ marginBottom: 6, marginTop: topOffset }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: gapPx,
        }}
      >
        {/* ซ้าย: โลโก้ + tagline */}
        <div style={{ textAlign: "left" }}>
          <div
            style={{
              fontFamily: "'Times New Roman', serif",
              fontStyle: "italic",
              fontWeight: 800,
              fontSize: logoPx,
              lineHeight: 0.8,
              letterSpacing: 1,
              textAlign: "center",
            }}
          >
            {logoText}
          </div>

          <div
            style={{
              fontFamily: "'Times New Roman', serif",
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: taglinePx,
              marginTop: 6,
            }}
          >
            {taglineTxt}
          </div>
        </div>

        {/* ขวา: ข้อมูลบริษัท */}
        <div
          style={{
            textAlign: "left",
//            fontFamily: (layout?.page?.base_font_family ?? ["AngsanaUPC","Angsana New","Tahoma","Arial","sans-serif"]).join(","),
            fontStyle: "normal", // แนะนำให้ normal เพราะ Angsana ถ้า italic บางทีดูแปลก
            lineHeight: 1,
            minWidth: minRightW,
            maxWidth: maxRightW,
            marginLeft: "auto",
            paddingTop: rightPadTop,
          }}
        >
          <div style={{ fontSize: thBoldPx, fontWeight: 700, marginBottom: 2 }}>
            {tx.name_th ?? "บริษัท มีดี้ เอ็นจิเนียริ่ง แอนด์ อิควิปเม้นท์ จำกัด (สำนักงานใหญ่)"}
          </div>

          <div style={{ fontSize: addrThPx, marginBottom: 2 }}>
            {tx.addr_th ?? "27 ซ.รามอินทรา 28 ..."}
          </div>

          <div style={{ fontSize: enBoldPx, fontWeight: 700, marginBottom: 4 }}>
            {tx.name_en ?? "MIDI Engineering and Equipment CO.,LTD."}
          </div>

          <div style={{ fontSize: addrEnPx, marginBottom: 2 }}>
            {tx.addr_en ?? "27 Soi Ramintra 28 ..."}
          </div>

          <div style={{ fontSize: telPx, fontWeight: 600 }}>
            {tx.tax_id
              ? `${tx.tax_label ?? "เลขประจำตัวผู้เสียภาษีอากร"} ${tx.tax_id}`
              : (tx.tel ?? "Tel/Fax 0-2510-5809")}
          </div>
        </div>
      </div>
    </div>
  );
};




const TitleBar: React.FC<{ title: string; layout: any }> = ({ title, layout }) => {
  const cfg = layout?.title_bar ?? {};
  const fontPx = cfg.font_px ?? 29;
  const pad = cfg.padding_px ?? [0, 0];
  const bTop = cfg.border?.top ? "1px solid #000" : "none";
  const bBottom = cfg.border?.bottom ? "1px solid #000" : "none";

  return (
    <div style={{
      textAlign: "center",
      fontSize: fontPx,
      fontWeight: 800,
      padding: `${pad[0]}px ${pad[1]}px`,
      margin: "6px 0 8px 0",
      borderTop: bTop,           
      borderBottom: bBottom,     
    }}>
      <div style={{ whiteSpace: "nowrap", wordBreak: "keep-all" }}>{title}</div>
    </div>
  );
};




// HeadGrid 
const HeadGrid: React.FC<{ doc: PrintDoc; layout: any }> = ({ doc, layout }) => {
  const hg   = layout?.head_grid ?? {};
  const sb   = hg.seller_block ?? {};
  const ri   = hg.right_info ?? {};
  const terms= hg.terms_block ?? {};
  const mt = +hg.offset_top_px || 0, mb = +hg.offset_bottom_px || 0, pl = +hg.offset_left_px || 0, pr = +hg.offset_right_px || 0;
  const lh = hg.line_height ?? 1;
  const riOffsetTop = Number(ri.offset_top_px ?? 0);
  const leftPct  = +(layout?.head_grid?.grid?.left_pct ?? 55);
  const rightPct = +(layout?.head_grid?.grid?.right_pct ?? 45);


  const pick = (bind?: string) => {
    if (!bind) return "";
    const chain = bind.split("|");
    for (const key of chain) {
      const path = key.trim().split(".");
      let v:any = { doc, party: (doc.customer || doc.party || {}), customer: doc.customer, totals: doc.totals };
      for (const step of path) v = v?.[step];
      if (Array.isArray(v)) {
        const joined = v.filter(Boolean).join("  ");
        if (joined) return joined;
      }
      if (v != null && v !== "") return v;
    }
    return "";
  };

  const party = doc.customer || doc.party || {};
  const poList: string[] = (doc.po_numbers?.length ? doc.po_numbers : (doc.po_number ? [doc.po_number] : []));
  const dateDMY = todayDMY(doc.document_date) || doc.doc_date_dmy || "-";
  const email = pick("party.email|customer.email") || "";
  const phone = pick("party.phone|customer.phone") || "";
  const hMap = (a?: string) => a === "center" ? "center" : a === "left" ? "flex-start" : "flex-end";
  const vMap = (a?: string) => a === "middle" ? "center" : a === "bottom" ? "flex-end" : "flex-start";
  const hAlign = hMap(ri.value_align);
  const vAlign = vMap(ri.value_valign);

  // helpers UI
  const Box: React.FC<React.PropsWithChildren<{ h: number; withRightBorder?: boolean }>> =
  ({ h, withRightBorder = true, children }) => (
    <div
      style={{
        border: BORDER,
        borderRight: withRightBorder ? BORDER : "none",
        height: h,
        padding: ri.box_padding_px ?? 6,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );

  return (
    <div style={{ marginTop: mt, marginBottom: mb, paddingLeft: pl, paddingRight: pr, lineHeight: lh }}>
      <Row gap={(layout?.head_grid?.col_gap_px ?? 8)}>
        {/* -------- LEFT -------- */}
        <Col w={`${leftPct}%`}>
          {sb?.top_left?.show !== false && (
            <Cell>
              <span style={{ fontSize: sb.top_left?.font_px ?? 16 }}>
                {(sb.top_left?.text ?? "JOB No.")} {pick(sb.top_left?.bind) || doc.job_no || doc.document_no || "-"}
              </span>
            </Cell>
          )}

          <div style={{ border: BORDER, height: sb.box_height_px ?? 160, padding: sb.box_padding_px ?? 6 }}>
            {/* label TH/EN รวมบรรทัดเดียว */}
            <Cell b>
              <span style={{ fontSize: sb.labels_px ?? 18 }}>
                {(sb.fields?.[0]?.label_th) || "นามผู้ซื้อ"}/{(sb.fields?.[0]?.label_en) || "CUSTOMERS NAME"}
              </span>
            </Cell>

            {/* เนื้อหา (ยกเว้นอีเมล/โทร) */}
            {(sb.fields ?? [])
              .filter((f:any)=>!["อีเมล","โทร"].includes(f.label_th ?? ""))
              .map((f:any,i:number)=>(
                <Cell key={`sb-${i}`}><span style={{ fontSize: sb.text_px ?? 18 }}>
                  {f.label_th === "เลขประจำตัวผู้เสียภาษีอากร"
                    ? `${f.label_th} ${pick(f.bind) || "-"}`
                    : (pick(f.bind) || "-")}
                </span></Cell>
              ))}

            {/* เนื้อหา (ยกเว้นอีเมล/โทร) */}
            {(email || phone) && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",       
                  columnGap: 16,
                  rowGap: 0,
                  alignItems: "baseline",
                }}
              >
                {email && (
                  <div style={{ flex: "1 1 320px", minWidth: 240 }}>
                    <Cell>
                      <span style={{ fontSize: sb.text_px ?? 18 }}>
                        อีเมล: {email}
                      </span>
                    </Cell>
                  </div>
                )}

                {phone && (
                  <div style={{ flex: "0 0 auto" }}>
                    <Cell>
                      <span style={{ fontSize: sb.text_px ?? 18 }}>
                        โทร: {phone}
                      </span>
                    </Cell>
                  </div>
                )}
              </div>
            )}

          </div>
        </Col>

        {/* -------- RIGHT (boxed) -------- */}
        <Col w={`${rightPct}%`}>
          <div style={{ marginTop: riOffsetTop }}>
            {ri?.top_right_note?.show && (
              <div style={{ textAlign:"right", marginBottom: 4 }}>
                <span style={{ fontSize: ri.top_right_note.font_px ?? 16 }}>
                  {ri.top_right_note.label || "เอกสารออกเป็นชุด"} {pick(ri.top_right_note.bind) || ""}
                </span>
              </div>
            )}

            {ri.show !== false && ri.boxed !== false && (
              <div style={{ display:"grid", gridTemplateColumns: `${(ri.col_split_pct?.[0] ?? 50)}% ${(ri.col_split_pct?.[1] ?? 50)}%`,
                            gap: ri.gap_px ?? 6 }}>
                {/* Row 1 */}
                <Box h={ri.row1_height_px ?? 64}>
                  {/* ป้าย label อยู่ด้านบนเหมือนเดิม */}
                  <div style={{ fontWeight: 700, fontSize: ri.label_px ?? 16 }}>
                    {ri.row1?.[0]?.label || "วันที่/DATE"}
                  </div>

                  {/* ค่า: จัดกึ่งกลางตาม JSON */}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: vAlign,      // top/middle/bottom
                      justifyContent: hAlign   // left/center/right
                    }}
                  >
                    <div style={{ fontSize: ri.value_px ?? 20 }}>
                      {pick(ri.row1?.[0]?.bind) || dateDMY}
                    </div>
                  </div>
                </Box>
                <Box h={ri.row1_height_px ?? 64}>
                  <div style={{ fontWeight: 700, fontSize: ri.label_px ?? 16 }}>
                    {ri.row1?.[1]?.label || "เลขที่/No."}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: vAlign,       // top/middle/bottom
                      justifyContent: hAlign,   // left/center/right
                    }}
                  >
                    <div style={{ fontSize: ri.value_px ?? 20 }}>
                      {pick(ri.row1?.[1]?.bind) || doc.display_no || ""}
                    </div>
                  </div>
                </Box>

                {/* Row 2 */}
                <Box h={ri.row2_height_px ?? 64}>
                  <div style={{ fontWeight: 700, fontSize: ri.label_px ?? 16 }}>
                    {ri.row2?.[0]?.label || "เลขที่ใบสั่งซื้อ"}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: vAlign,
                      justifyContent: hAlign,
                    }}
                  >
                    <div style={{ fontSize: ri.value_px ?? 20 }}>
                      {doc.form === "B"
                        ? (doc.display_no || "")
                        : (pick(ri.row2?.[0]?.bind) || (poList.length ? poList.join("  ") : ""))}
                    </div>
                  </div>
                </Box>
                <Box h={ri.row2_height_px ?? 64}>
                  <div style={{ fontWeight: 700, fontSize: ri.label_px ?? 16 }}>
                    {ri.row2?.[1]?.label || "รหัสผู้ขาย/SUPPLIER CODE"}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: vAlign,
                      justifyContent: hAlign,
                    }}
                  >
                    <div style={{ fontSize: ri.value_px ?? 20 }}>
                      {pick(ri.row2?.[1]?.bind) ||
                        pick("party.supplier_code|supplier_code|party.customer_no|customer.customer_no") ||
                        ""}
                    </div>
                  </div>
                </Box>
              </div>
            )}
          </div>
        </Col>
      </Row>

      {/* TERMS (ปิด/เปิดได้) */}
      {terms?.show !== false && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: terms.gap_px ?? 6,
            marginTop: 6,
          }}
        >
          {[
            { th: terms.labels?.[0]?.th, en: terms.labels?.[0]?.en, v: terms.defaults?.term },
            { th: terms.labels?.[1]?.th, en: terms.labels?.[1]?.en, v: terms.defaults?.price_validity },
            { th: terms.labels?.[2]?.th, en: terms.labels?.[2]?.en, v: terms.defaults?.delivery_validity },
          ].map((b, i) => (
            <div
              key={`term-${i}`}
              style={{
                border: BORDER,
                minHeight: terms.box_height_px ?? 60,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ padding: "4px 6px", textAlign: "center", fontWeight: 700, fontSize: terms.label_th_px }}>
                {b.th}
              </div>
              <div style={{ padding: "2px 6px", textAlign: "center", fontSize: terms.label_en_px, fontWeight: 700 }}>
                {b.en}
              </div>

              {/* เส้นคั่นกลางกล่อง */}
              <div style={{ borderTop: BORDER }} />

              {/* ค่า กลางกล่อง */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "6px",
                  fontSize: terms.value_px,
                  fontWeight: 700,
                }}
              >
                {b.v || "30 day"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};



// ใช้ JSON layout ที่ import มาข้างบน
const ItemsTable: React.FC<{ items: DocItem[]; layout: any; form?: string }> = ({ items, layout, form }) => {
  const rows = items?.length ? items : [];
  const minRows = layout?.items_table?.min_rows ?? 10;
  const valuePx = layout?.items_table?.value_px ?? 21;
  const headPx  = layout?.items_table?.head_px ?? 18;
  const headH   = layout?.items_table?.head_height_px ?? 26;
  const rowH    = layout?.items_table?.row_height_px ?? 31;
  const cols = layout?.items_table?.columns ?? [];
  const headPad = layout?.items_table?.head_padding_px ?? 6;
  const bodyHLines = layout?.items_table?.body_hlines ?? true;

  const th = (txt: string, opt?: { noTop?: boolean; noBottom?: boolean }) => (
    <th
      style={{
        borderLeft: BORDER,
        borderRight: BORDER,
        borderTop: opt?.noTop ? "none" : BORDER,
        borderBottom: opt?.noBottom ? "none" : BORDER,
        padding: `${PAD_Y}px ${PAD_X}px`,
        fontWeight: 800,
        textAlign: "center",
        fontSize: headPx,
        lineHeight: 1,           
        height: headH,           
        verticalAlign: "middle",
      }}
    >
      {txt}
    </th>
  );
  const td = (
    children: React.ReactNode,
    opt?: { align?: "left" | "center" | "right"; topBorder?: boolean; bottomBorder?: boolean }
  ) => (
    <td
      style={{
        borderLeft: BORDER,
        borderRight: BORDER,
        borderTop:
          opt?.topBorder === false
            ? "none"
            : bodyHLines
            ? BORDER
            : "none",
        borderBottom:
          opt?.bottomBorder === true
            ? BORDER // ใช้ปิดขอบล่างสุดของตาราง
            : bodyHLines
            ? BORDER
            : "none",
        padding: `${PAD_Y}px ${PAD_X}px`,
        textAlign: opt?.align || "left",
        fontSize: valuePx,
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );

  const pads = Math.max(0, minRows - rows.length);

  return (
    <table style={{ width:"100%", borderCollapse:"collapse", marginTop:6 }}>
      <colgroup>
        {cols.map((c:any, i:number) => <col key={`col-${i}`} style={{ width: typeof c.width_px === "number" ? `${c.width_px}px` : c.width_px }} />)}
      </colgroup>

      <thead>
        {/* แถวหัวเรื่องภาษาไทย */}
        <tr>
          {cols.map((c:any, i:number) => th(c.label_th, { noBottom: true }))}
        </tr>

        {/* แถวหัวเรื่องภาษาอังกฤษ */}
        <tr style={{ fontWeight: 600 }}>
          {cols.map((c:any, i:number) => th(c.label_en, { noTop: true }))}
        </tr>
      </thead>

      <tbody>
        {rows.map((it, i) => {
          const isLastDataRow = i === rows.length - 1 && pads === 0;
          return (
            <tr key={`row-${i}`} style={{ height: rowH }}>
              {td(i + 1, { align: "center", bottomBorder: !bodyHLines && isLastDataRow })}
              {td(
                <>
                  <div style={{ fontWeight: 700 }}>{it.name || it.description || "-"}</div>
{/*
                  {it.product_no ? (
                    <div style={{ fontSize: valuePx - 3, opacity: 0.8 }}>({it.product_no})</div>
                  ) : null}
*/}
                </>
              , { bottomBorder: !bodyHLines && isLastDataRow })}
              {td(it.quantity ?? "-", { align: "right", bottomBorder: !bodyHLines && isLastDataRow })}
              {td(fmt(it.unit_price), { align: "right", bottomBorder: !bodyHLines && isLastDataRow })}
              {td(fmt(it.line_amount), { align: "right", bottomBorder: !bodyHLines && isLastDataRow })}
            </tr>
          );
        })}

        {/* แถว padding */}
        {Array.from({ length: pads }).map((_, k, arr) => {
          const isLastPad = k === arr.length - 1;
          return (
            <tr key={`pad-${k}`} style={{ height: rowH }}>
              {cols.map((_: any, idx: number) =>
                td("\u00A0", {
                  align: idx === 0 ? "center" : "left",
                  bottomBorder: !bodyHLines && isLastPad, // ให้เส้นขอบล่างสุด
                })
              )}
            </tr>
          );
        })}
      </tbody>

    </table>
  );
};



const SummaryBlock: React.FC<{ totals: Totals; remark?: string; layout: any }> = ({
  totals, remark, layout
}) => {
  const sumCfg   = layout?.summary?.totals_box ?? {};
  const blockGap = Number(layout?.summary?.block_gap_px ?? 6); // เว้นระหว่าง “บล็อกบน/ล่าง”

  // ขนาดฝั่งรวมยอด (ขวา)
  const RIGHT_W   = Number(sumCfg.width_px)        || 271;  // ความกว้างคอลัมน์ขวา
  const VALUE_W   = Number(sumCfg.value_box_w_px)  || 120;  // ความกว้างกล่องตัวเลข
  const ROW_H     = Number(sumCfg.row_h_px)        || 40;   // ความสูงต่อแถว
  const GAP       = Number(sumCfg.gap_px)          || 0;    // ระยะห่างในบล็อกขวา (ถ้าอยากใช้)
  
  const BORDER_PX = Number(sumCfg.border_px ?? BORDER_W) || BORDER_W;
  const BORDER_LINE = `${BORDER_PX}px solid #000`;
  
  const LBL_PX    = Number(sumCfg.label_px)        || 16;
  const VAL_PX    = Number(sumCfg.value_px)        || 22;
  const tb      = layout?.summary?.totals_box ?? {};
  const rb      = layout?.summary?.remark ?? {};
  const ROWS = Number(tb.rows_count ?? 3); // ถ้าไม่ใส่ใน JSON จะถือว่า 3 แถว (Subtotal, VAT, Net)
  const Mt      = Number(layout?.summary?.margin_top_px ?? 0);
  const PANEL_PAD = 6;
  const labelOffsetY = Number(sumCfg.label_offset_y_px ?? 4);
  const showEN = sumCfg.show_en_labels !== false;
  



  // ให้บล็อกซ้าย (REMARK) สูงเท่าบล็อกขวา 3 แถวรวมเส้น
  const RIGHT_H = ROW_H * ROWS + BORDER_PX * Math.max(ROWS - 1, 0);
  const REMARK_H  = Number(layout?.summary?.remark?.min_height_px ?? 120);
  const sum   = totals || {};
  const fallbackKey = layout?.summary?.remark?.fallback_bind;
//  const words = fallbackKey === "grand_total_baht_text" ? thBahtText(sum.grand_total || 0) : "";
  const words = (layout?.summary?.remark?.fallback_bind === "grand_total_baht_text")
  ? thBahtText(sum.grand_total || 0)
  : "";

  const remarkText = (remark ?? "").trim();
  const remarkValuePx = Number(layout?.page?.base_font_px ?? 14);
  const dividerOffsetPx = (ROW_H + BORDER_PX) * Math.max(ROWS - 1, 0);


  const fp = layout?.summary?.fine_print ?? {};
  const leftIdx  = Number(fp.left_index  ?? 1); // ซ้าย = ได้ตรวจรับ…
  const rightIdx = Number(fp.right_index ?? 0); // ขวา = ข้อโต้แย้ง 7 วัน
  const leftLine  = fp.lines?.[leftIdx];
  const rightLine = fp.lines?.[rightIdx];


  // หนึ่งแถวในกล่องรวมยอด
  const TotalRow: React.FC<{ th: string; en: string; val?: number; bold?: boolean; first?: boolean; last?: boolean }> =
  ({ th, en, val, bold, first, last }) => {
    const isLast = !!last;
    const isFirst = !!first;
    return (
      <div style={{ display: "flex", height: ROW_H }}>
        {/* ซ้าย (ป้าย) */}
        <div
          style={{
            flex: 1,
            borderTop: "none",
            borderBottom: isLast ? "none" : BORDER_LINE,
            borderLeft: "none",
            borderRight: "none",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 6px",
          }}
        >
          <div style={{ paddingTop: labelOffsetY, lineHeight: 1 }}>
            <div style={{ fontWeight: bold ? 700 : 600, fontSize: LBL_PX, margin: 0 }}>
              {th}
            </div>
            {showEN && (
              <div style={{ fontSize: Math.max(12, LBL_PX - 2), opacity: 0.9, margin: 0 }}>
                {en}
              </div>
            )}
          </div>
        </div>

        {/* ขวา (ตัวเลข) */}
        <div
          style={{
            width: VALUE_W,
            borderTop: "none",
            borderBottom: isLast ? "none" : BORDER_LINE,
            borderRight: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0 8px",
            fontSize: VAL_PX,
            fontWeight: bold ? 800 : 600,
          }}
        >
          {fmt(val)}
        </div>
      </div>
    );
  };


  
  return (
    <div>
      {/* ===== บล็อกบน: REMARK (ซ้าย) + รวมยอด (ขวา) ในกรอบเดียว ===== */}
      <div
        style={{
          display: "flex",
          marginTop: Mt,
          border: "none",
          borderBottom: BORDER_LINE,
          borderTop:    "none", 
          borderRight:  BORDER_LINE,
          borderLeft:   BORDER_LINE,      
        }}
      >
        {/* ซ้าย: REMARK (ให้สูงเท่าฝั่งขวา) */}
        <div
          style={{
            flex: 1,
            minHeight: RIGHT_H,               
            padding: `0 ${PANEL_PAD}px`,
            boxSizing: "border-box",
            borderRight: BORDER_LINE,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ส่วนบน: title + remark */}
          <div style={{ minHeight: Math.max(0, dividerOffsetPx - BORDER_PX) }}>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: Number(layout?.summary?.remark?.title_px ?? 18) }}>
              REMARK
            </div>
            {remarkText && (
              <div style={{ whiteSpace: "pre-wrap", fontSize: remarkValuePx, lineHeight: 1.2 }}>
                {remarkText}
              </div>
            )}
          </div>

          

          {/* ส่วนล่าง: จำนวนเงินเป็นตัวหนังสือ */}
          <div
            style={{
              marginTop: "-2px",                   // ดันลงก้นกล่องถ้า remark ยาว
              marginLeft: -PANEL_PAD,
              marginRight: -PANEL_PAD,
              borderTop: BORDER_LINE,
              height: ROW_H,                       // ★ สูงเท่าหนึ่งแถว
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              padding: "0 8px",                    // ★ ใช้ padding แนวนอนอย่างเดียว
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {words}
          </div>
        </div>

        {/* ขวา: รวมราคาทั้งสิ้น / VAT / NET */}
        <div style={{ width: RIGHT_W, display: "flex", flexDirection: "column" }}>
          <TotalRow th="รวมราคาทั้งสิ้น"     en="TOTAL PRICE" val={sum.subtotal} first />
          <TotalRow th="ภาษีมูลค่าเพิ่ม/VAT" en="VAT"         val={sum.vat_amount} />
          <TotalRow th="จำนวนเงินรวมทั้งสิ้น" en="NET PRICE"   val={sum.grand_total} bold last />
        </div>
      </div>

      {/* ระยะห่างระหว่างบล็อก (ถ้าต้องการให้ติดกัน ตั้ง block_gap_px = 0) */}
      {blockGap > 0 && <div style={{ height: blockGap }} />}



        
      {/* ===== บล็อกล่าง: ข้อความ 2 ชุด แบ่งซ้าย/ขวา ภายในกรอบเดียว ===== */}
      <div style={{ display: "flex", border: BORDER_LINE }}>
        {/* ซ้าย: ได้ตรวจรับ… */}
        <div style={{ flex: 1, padding: 6, borderRight: BORDER_LINE }}>
          <div style={{ fontSize: fp.th_px ?? 16 }}>
            {rightLine?.th || "หากมีข้อโต้แย้งให้รีบแจ้งทางบริษัท ภายใน 7 วัน นับแต่วันรับของ มิฉะนั้นทางร้านจะมิยอมรับในความผิดพลาดใดๆ"}
          </div>
          <div style={{ fontSize: fp.en_px ?? 14, opacity: 0.9 }}>
            {rightLine?.en || "CLAIMS NOT MADE WITHIN 7 DAYS AFTER RECEIPT OF GOODS CANNOT BE ACCEPTED"}
          </div>
        </div>

        {/* ขวา: หากมีข้อโต้แย้ง… */}
        <div style={{ width: RIGHT_W, padding: 6 }}>
          <div style={{ fontSize: fp.th_px ?? 16 }}>
            {leftLine?.th || "ได้ตรวจรับมอบสินค้าตามรายการและจำนวนในสภาพที่เรียบร้อย"}
          </div>
          <div style={{ fontSize: fp.en_px ?? 14, opacity: 0.9 }}>
            {leftLine?.en || "GOODS ARE RECEIVED AT THE ABOVE QUANTITY AND IN THE GOOD MANNER"}
          </div>
        </div>
      </div>
    </div>
  );
};



const Signatures: React.FC<{ form: PrintDoc["form"]; layout: any }> = ({ form, layout }) => {
  const sg   = layout?.signatures ?? {};
  const gapPx = Number(sg.gap_px ?? 6);
  const mtPx  = Number(sg.margin_top_px ?? 0);
  const minH  = Number(sg.min_height_px ?? 80);
  const thPx  = Number(sg.label_th_px ?? 16);
  const enPx  = Number(sg.label_en_px ?? 14);

  // อ่าน “boxes” จาก JSON ถ้าไม่มีให้ใช้ค่าเดิมเป็น fallback
  const defaultBoxes = [
    { th: "ผู้รับสินค้า", th_en: "GOODS RECEIVED" },
    { th: "วันที่",       th_en: "DATE" },
    { th: "ผู้ส่งสินค้า", th_en: "DELIVERED BY" },
    { th: "ลงนาม",       th_en: "SIGNATURE" },
  ];
  const boxes: Array<{ th?: string; en?: string; width_pct?: number }> =
    Array.isArray(sg.boxes) && sg.boxes.length
      ? sg.boxes
      : defaultBoxes.map(b => ({ th: b.th, en: (b as any).th_en }));

  const box = (labelTH: string, labelEN: string) => (
    <div style={{ border: "1px solid #000", minHeight: minH, padding: 6 }}>
      <div style={{ height: Math.max(0, minH - 24) }} /> {/* ช่องเซ็นชื่อ */}
      <div style={{ textAlign: "center", fontSize: thPx }}>{labelTH}</div>
      <div style={{ textAlign: "center", fontSize: enPx, opacity: 0.9 }}>{labelEN}</div>
    </div>
  );

  // ถ้ามี width_pct ใน JSON ก็ใช้ได้เลย (เช่น { "width_pct": 25 }), ไม่งั้น fallback ให้ช่องที่ 2 = 25%
  const colWidth = (i: number) =>
    typeof boxes[i]?.width_pct === "number" ? `${boxes[i].width_pct}%` : (i === 1 ? "25%" : undefined);

  return (
    <Row style={{ marginTop: mtPx, gap: gapPx }}>
      {boxes.map((b, i) => (
        <Col key={i} w={colWidth(i)}>
          {box(b.th ?? "", b.en ?? "")}
        </Col>
      ))}
    </Row>
  );
};



/** ---------- Main ---------- */
export default function DocumentPrint({ doc, layout }: { doc: any; layout: any }) {
  const [mt, mr, mb, ml] = layout?.page?.margins_mm ?? [4, 10, 4, 30];
  const baseFamily = (layout?.page?.base_font_family ?? ["'TH Sarabun New'", "Arial"]).join(",");
  const basePx = layout?.page?.base_font_px ?? 14;
  const baseLH = layout?.page?.line_height ?? 1.15;

  const remarkFromItems =
  Array.isArray(doc?.items) && doc.items.length
    ? String(doc.items[0]?.description || "").trim()
    : "";

  const remarkForSummary =
  typeof doc?.remark === "string" ? doc.remark.trim() : "";

  return (
    <div style={{ fontFamily: baseFamily, color: "#111", fontSize: basePx, lineHeight: baseLH }}>
      <style>{`
        /* ===== Print foundation (ล็อกให้คงที่ทุกเครื่อง) ===== */
        * { box-sizing: border-box; }

        html, body {
          margin: 0 !important;
          padding: 0 !important;
        }

        @page {
          size: A4;
          margin: ${mt}mm ${mr}mm ${mb}mm ${ml}mm;
        }

        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* กัน browser ปรับขนาดฟอนต์เอง */
          html { -webkit-text-size-adjust: 100%; }

          /* ช่วยให้หัวตารางไม่กระโดด */
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }

          /* กัน break หน้าแบบมั่ว ๆ ในบล็อกสำคัญ */
          .midi-no-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }

        /* ให้ table ใช้ base font แน่นอน */
        table { font-size: ${basePx}px; border-collapse: collapse; }

        /* ตัด margin ที่ browser ชอบใส่ให้ <p> / <div> บางจุด */
        p { margin: 0; }
      `}</style>

      {/* HEADER */}
      <CompanyHead layout={layout} />

      {/* TITLE */}
      <TitleBar title={doc.header_title} layout={layout} />

      {/* HEAD GRID */}
      <HeadGrid doc={doc} layout={layout} />

      {/* ITEMS */}
      <ItemsTable items={doc.items || []} layout={layout} form={doc.form} />

      {/* SUMMARY + SIGN */}
      <div className="midi-no-break">
        <SummaryBlock totals={doc.totals || {}} remark={remarkForSummary} layout={layout} />
        <Signatures form={doc.form} layout={layout} />
      </div>
    </div>
  );
}

