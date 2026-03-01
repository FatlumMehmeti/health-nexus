import * as React from "react";

import type { Contract } from "@/interfaces/contract";
import { API_BASE_URL } from "@/lib/api-client";

/**
 * We keep the primitive types loose because the PDF renderer is loaded dynamically at runtime.
 * This avoids hard build-time coupling when the package is temporarily unavailable.
 */
export interface ReactPdfPrimitives {
  Document: React.ComponentType<React.PropsWithChildren>;
  Page: React.ComponentType<React.PropsWithChildren<Record<string, unknown>>>;
  Text: React.ComponentType<React.PropsWithChildren<Record<string, unknown>>>;
  View: React.ComponentType<React.PropsWithChildren<Record<string, unknown>>>;
  Image: React.ComponentType<Record<string, unknown>>;
  StyleSheet: {
    create: (styles: Record<string, unknown>) => Record<string, unknown>;
  };
}

interface ContractPdfDocumentProps {
  contract: Contract;
  primitives: ReactPdfPrimitives;
}

/**
 * Contract terms are stored as HTML, but PDF text blocks should render plain text reliably.
 * We strip tags so the generated PDF remains stable regardless of HTML complexity.
 */
export function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Backend may return relative signature paths (e.g. /uploads/signatures/file.png).
 * PDF renderer needs absolute URLs, so we prepend API_BASE_URL when needed.
 */
function resolveAssetUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) {
    return `${API_BASE_URL.replace(/\/+$/, "")}${url}`;
  }
  return `${API_BASE_URL.replace(/\/+$/, "")}/${url}`;
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ContractPdfDocument({
  contract,
  primitives,
}: ContractPdfDocumentProps) {
  const { Document, Page, Text, View, Image, StyleSheet } = primitives;

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        page: {
          padding: 24,
          fontSize: 11,
          lineHeight: 1.4,
          fontFamily: "Helvetica",
        },
        title: {
          fontSize: 18,
          marginBottom: 12,
          fontWeight: 700,
        },
        section: {
          marginBottom: 10,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
        },
        label: {
          fontWeight: 700,
        },
        row: {
          marginBottom: 4,
        },
        signatures: {
          flexDirection: "row",
          gap: 16,
          marginTop: 8,
        },
        signatureBlock: {
          flex: 1,
          borderWidth: 1,
          borderColor: "#e5e7eb",
          borderRadius: 4,
          padding: 8,
          minHeight: 120,
        },
        signatureImage: {
          width: "100%",
          height: 70,
          objectFit: "contain",
          marginTop: 6,
        },
      }),
    [StyleSheet],
  );

  const doctorSignatureUrl = resolveAssetUrl(contract.doctor_signature);
  const hospitalSignatureUrl = resolveAssetUrl(contract.hospital_signature);
  const termsText = stripHtmlToPlainText(contract.terms_content);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Doctor Contract #{contract.id}</Text>

        <View style={styles.section}>
          <Text style={styles.row}>
            <Text style={styles.label}>Tenant ID: </Text>
            {contract.tenant_id}
          </Text>
          <Text style={styles.row}>
            <Text style={styles.label}>Doctor ID: </Text>
            {contract.doctor_user_id}
          </Text>
          <Text style={styles.row}>
            <Text style={styles.label}>Status: </Text>
            {contract.status}
          </Text>
          <Text style={styles.row}>
            <Text style={styles.label}>Salary: </Text>
            {contract.salary}
          </Text>
          <Text style={styles.row}>
            <Text style={styles.label}>Start Date: </Text>
            {formatDate(contract.start_date)}
          </Text>
          <Text style={styles.row}>
            <Text style={styles.label}>End Date: </Text>
            {formatDate(contract.end_date)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Terms (plain text)</Text>
          <Text>{termsText || "-"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Lifecycle</Text>
          <Text style={styles.row}>Activated: {formatDate(contract.activated_at)}</Text>
          <Text style={styles.row}>Expires: {formatDate(contract.expires_at)}</Text>
          <Text style={styles.row}>
            Terminated Reason: {contract.terminated_reason || "-"}
          </Text>
          <Text style={styles.row}>Updated: {formatDate(contract.updated_at)}</Text>
        </View>

        <View style={styles.signatures}>
          <View style={styles.signatureBlock}>
            <Text style={styles.label}>Doctor Signature</Text>
            <Text>Signed At: {formatDate(contract.doctor_signed_at)}</Text>
            {doctorSignatureUrl ? (
              <Image style={styles.signatureImage} src={doctorSignatureUrl} />
            ) : (
              <Text>Not signed</Text>
            )}
          </View>

          <View style={styles.signatureBlock}>
            <Text style={styles.label}>Hospital Signature</Text>
            <Text>Signed At: {formatDate(contract.hospital_signed_at)}</Text>
            {hospitalSignatureUrl ? (
              <Image style={styles.signatureImage} src={hospitalSignatureUrl} />
            ) : (
              <Text>Not signed</Text>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}
