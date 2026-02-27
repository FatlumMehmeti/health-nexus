import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { requireAuth } from "@/lib/guards/requireAuth";
import { isApiError } from "@/lib/api-client";
import { tenantsService } from "@/services/tenants.service";
import { TenantBrandPreview } from "@/components/molecules/tenant-brand-preview";
import type {
  DoctorRead,
  ProductCreateForTenant,
  ProductRead,
  ProductUpdateInput,
  ServiceLandingItem,
  ServiceUpdateInput,
  TenantDepartmentWithServicesRead,
  TenantDetailsRead,
  TenantDetailsUpdate,
} from "@/interfaces";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard/tenant")({
  beforeLoad: requireAuth({ routeKey: "DASHBOARD_TENANT" }),
  validateSearch: (search: Record<string, unknown>) => {
    const allowed = new Set([
      "departments-services",
      "products",
      "plans",
      "settings",
    ]);
    const raw = typeof search.section === "string" ? search.section : "";
    const section = allowed.has(raw) ? raw : "departments-services";
    return { section: section as TenantSectionKey };
  },
  component: TenantManagerPage,
});

const QUERY_KEYS = {
  current: ["tenant-manager", "current"] as const,
  details: ["tenant-manager", "details"] as const,
  doctors: ["tenant-manager", "doctors"] as const,
  departments: ["tenant-manager", "departments"] as const,
  products: ["tenant-manager", "products"] as const,
  fonts: ["tenant-manager", "fonts"] as const,
  brands: ["tenant-manager", "brands"] as const,
  departmentCatalog: ["tenant-manager", "department-catalog"] as const,
};

interface TenantDetailsFormState {
  logo: string;
  image: string;
  moto: string;
  title: string;
  about_text: string;
  brand_id: number | null;
  font_id: number | null;
}

interface DepartmentDraft {
  local_id: string;
  id?: number;
  department_id: number | null;
  department_name: string;
  phone_number: string;
  email: string;
  location: string;
  isEditing: boolean;
}

interface ProductFormState {
  name: string;
  description: string;
  price: string;
  stock_quantity: string;
  is_available: boolean;
}

interface ServiceFormState {
  name: string;
  price: string;
  description: string;
  is_active: boolean;
}

interface DepartmentFormModalState {
  department_id: number | null;
  phone_number: string;
  email: string;
  location: string;
}

type TenantSectionKey =
  | "departments-services"
  | "products"
  | "plans"
  | "settings";

const TENANT_SECTIONS: Array<{
  key: TenantSectionKey;
  label: string;
  description: string;
}> = [
  {
    key: "departments-services",
    label: "Departments & Services",
    description: "Department contacts and nested services",
  },
  {
    key: "products",
    label: "Products",
    description: "Tenant products shown on landing",
  },
  {
    key: "plans",
    label: "Plans",
    description: "Subscriptions and plans (placeholder)",
  },
  {
    key: "settings",
    label: "Settings",
    description: "Branding, fonts, and palette",
  },
];

function TenantManagerPage() {
  const queryClient = useQueryClient();
  const { section: activeSection } = Route.useSearch();

  const currentTenantQuery = useQuery({
    queryKey: QUERY_KEYS.current,
    queryFn: () => tenantsService.getCurrentTenant(),
  });

  const notifyDataChanged = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.details });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.departments });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
  };

  if (currentTenantQuery.isLoading) {
    return (
      <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (currentTenantQuery.isError) {
    return (
      <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">My Tenant</h1>
        <Card>
          <CardContent className="pt-6 text-destructive">
            Failed to load tenant context: {getErrorMessage(currentTenantQuery.error)}
          </CardContent>
        </Card>
      </div>
    );
  }

  const tenant = currentTenantQuery.data;
  if (!tenant) {
    return (
      <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">My Tenant</h1>
        <Card>
          <CardContent className="pt-6 text-muted-foreground">
            No tenant context available.
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeSectionMeta =
    TENANT_SECTIONS.find((item) => item.key === activeSection) ??
    TENANT_SECTIONS[0];

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">My Tenant</h1>
        <p className="text-muted-foreground">
          Manage branding, departments, services, and products for your tenant.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tenant.name}</CardTitle>
          <CardDescription>
            {tenant.slug ? `Public landing slug: ${tenant.slug}` : "No public slug yet"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoPill label="Tenant ID" value={String(tenant.id)} />
          <InfoPill label="Email" value={tenant.email} />
          <InfoPill label="Licence" value={tenant.licence_number} />
          <InfoPill
            label="Status"
            value={tenant.status ? String(tenant.status) : "unknown"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{activeSectionMeta.label}</CardTitle>
          <CardDescription>{activeSectionMeta.description}</CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-6">
        {activeSection === "departments-services" && (
          <>
            <DoctorsManager />
            <TenantDepartmentsManager onSaved={notifyDataChanged} />
          </>
        )}

        {activeSection === "products" && (
          <ProductsManager onSaved={notifyDataChanged} />
        )}

        {activeSection === "plans" && (
          <TenantPlansPanel />
        )}

        {activeSection === "settings" && <TenantDetailsEditor onSaved={notifyDataChanged} />}
      </div>
    </div>
  );
}

function TenantPlansPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Plans</CardTitle>
        <CardDescription>
          Plan and subscription management is not wired yet in the current tenant-manager flow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoPill label="Current Plan" value="Not configured" />
          <InfoPill label="Billing" value="Pending integration" />
          <InfoPill label="Renewal" value="Pending integration" />
        </div>
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Placeholder section requested by UI structure. When plan APIs are added, this section can
          host plan details, upgrade/downgrade actions, and billing history.
        </div>
      </CardContent>
    </Card>
  );
}

function TenantDetailsEditor({ onSaved }: { onSaved: () => void }) {
  const queryClient = useQueryClient();

  const fontsQuery = useQuery({
    queryKey: QUERY_KEYS.fonts,
    queryFn: () => tenantsService.listFonts(),
  });
  const brandsQuery = useQuery({
    queryKey: QUERY_KEYS.brands,
    queryFn: () => tenantsService.listBrands(),
  });
  const detailsQuery = useQuery({
    queryKey: QUERY_KEYS.details,
    queryFn: async () => {
      try {
        return await tenantsService.getTenantDetails();
      } catch (err) {
        if (isApiError(err) && err.status === 404) return null;
        throw err;
      }
    },
  });

  const [form, setForm] = useState<TenantDetailsFormState>(emptyDetailsForm());

  useEffect(() => {
    if (detailsQuery.data === undefined) return;
    setForm(mapDetailsToForm(detailsQuery.data));
  }, [detailsQuery.data]);

  const selectedFont = fontsQuery.data?.find((f) => f.id === form.font_id) ?? null;
  const selectedBrand = brandsQuery.data?.find((b) => b.id === form.brand_id) ?? null;

  const saveMutation = useMutation({
    mutationFn: (payload: TenantDetailsUpdate) => tenantsService.updateTenantDetails(payload),
    onSuccess: () => {
      toast.success("Tenant details updated");
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.details });
      onSaved();
    },
    onError: (err) => {
      toast.error("Failed to update tenant details", {
        description: getErrorMessage(err),
      });
    },
  });

  const isLoading = fontsQuery.isLoading || brandsQuery.isLoading || detailsQuery.isLoading;
  const loadError = fontsQuery.error ?? brandsQuery.error ?? detailsQuery.error;

  const handleSave = () => {
    const payload = diffTenantDetailsPayload(form, detailsQuery.data ?? null);
    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save");
      return;
    }
    saveMutation.mutate(payload);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenant Details (Branding)</CardTitle>
        <CardDescription>
          Edit logo, imagery, title, moto, brand palette, fonts, and about text used by the landing page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-52 w-full" />
          </div>
        ) : loadError ? (
          <p className="text-sm text-destructive">{getErrorMessage(loadError)}</p>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,35%)_minmax(0,65%)] lg:items-start">
              <div className="space-y-3 lg:sticky lg:top-24 lg:self-start">
                <Label>About Preview</Label>
                <TenantBrandPreview
                  title={form.title}
                  moto={form.moto}
                  aboutText={form.about_text}
                  logo={form.logo}
                  image={form.image}
                  backgroundColor={selectedBrand?.brand_color_background}
                  foregroundColor={selectedBrand?.brand_color_foreground}
                  borderColor={selectedBrand?.brand_color_muted}
                  accentColor={
                    selectedBrand?.brand_color_secondary ?? selectedBrand?.brand_color_primary
                  }
                  headerFontFamily={selectedFont?.header_font_family}
                  bodyFontFamily={selectedFont?.body_font_family}
                  fallbackTitle="Landing section title"
                  fallbackMoto="Moto preview"
                  fallbackAbout="Your about text preview will appear here."
                  emptyHeroLabel="Hero image preview"
                />
                <p className="text-xs text-muted-foreground">
                  Live preview updates as you type using the selected font and brand colors.
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <Label htmlFor="tenant-logo">Logo URL</Label>
                    <Input
                      id="tenant-logo"
                      value={form.logo}
                      onChange={(e) => setForm((s) => ({ ...s, logo: e.target.value }))}
                      placeholder="https://..."
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="tenant-image">Hero Image URL</Label>
                    <Input
                      id="tenant-image"
                      value={form.image}
                      onChange={(e) => setForm((s) => ({ ...s, image: e.target.value }))}
                      placeholder="https://..."
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="tenant-moto">Moto</Label>
                    <Input
                      id="tenant-moto"
                      value={form.moto}
                      onChange={(e) => setForm((s) => ({ ...s, moto: e.target.value }))}
                      placeholder="Your health, our priority"
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="tenant-title">Landing Title</Label>
                    <Input
                      id="tenant-title"
                      value={form.title}
                      onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                      placeholder="Bluestone Clinic"
                    />
                  </Field>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenant-about">About Text</Label>
                  <textarea
                    id="tenant-about"
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 min-h-40 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                    value={form.about_text}
                    onChange={(e) => setForm((s) => ({ ...s, about_text: e.target.value }))}
                    placeholder="Describe your clinic, specialties, and patient care approach..."
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-medium">Font Presets</h3>
                    <p className="text-xs text-muted-foreground">
                      Click a font card to preview header and body styles before saving.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {(fontsQuery.data ?? []).map((font) => (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => setForm((s) => ({ ...s, font_id: font.id }))}
                        className={[
                          "rounded-lg border p-4 text-left transition",
                          form.font_id === font.id
                            ? "border-primary ring-primary/20 ring-2"
                            : "hover:border-primary/50",
                        ].join(" ")}
                      >
                        <p className="font-medium">{font.name}</p>
                        <p
                          className="mt-2 text-base"
                          style={{ fontFamily: font.header_font_family }}
                        >
                          Heading Preview
                        </p>
                        <p
                          className="mt-1 text-sm text-muted-foreground"
                          style={{ fontFamily: font.body_font_family }}
                        >
                          Body preview for about text and content sections.
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {font.header_font_family} / {font.body_font_family}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-medium">Brand Palettes</h3>
                    <p className="text-xs text-muted-foreground">
                      Click a palette card to preview landing page colors.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {(brandsQuery.data ?? []).map((brand) => (
                      <button
                        key={brand.id}
                        type="button"
                        onClick={() => setForm((s) => ({ ...s, brand_id: brand.id }))}
                        className={[
                          "rounded-lg border p-4 text-left transition",
                          form.brand_id === brand.id
                            ? "border-primary ring-primary/20 ring-2"
                            : "hover:border-primary/50",
                        ].join(" ")}
                        style={{
                          background:
                            brand.brand_color_background &&
                            brand.brand_color_background !== "transparent"
                              ? `linear-gradient(180deg, ${brand.brand_color_background}, rgba(255,255,255,0.9))`
                              : undefined,
                        }}
                      >
                        <p className="font-medium">{brand.name}</p>
                        <div className="mt-3 grid grid-cols-5 gap-2">
                          {[
                            ["P", brand.brand_color_primary],
                            ["S", brand.brand_color_secondary],
                            ["BG", brand.brand_color_background],
                            ["FG", brand.brand_color_foreground],
                            ["M", brand.brand_color_muted],
                          ].map(([label, hex]) => (
                            <div key={String(label)} className="space-y-1 text-center">
                              <div
                                className="h-8 rounded border"
                                style={{ backgroundColor: String(hex) }}
                                title={`${label}: ${hex}`}
                              />
                              <p className="text-[10px] text-muted-foreground">{label}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
                          <p>Primary: {brand.brand_color_primary}</p>
                          <p>Secondary: {brand.brand_color_secondary}</p>
                          <p>Background: {brand.brand_color_background}</p>
                          <p>Foreground: {brand.brand_color_foreground}</p>
                          <p>Muted: {brand.brand_color_muted}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setForm(mapDetailsToForm(detailsQuery.data ?? null))}
                  >
                    Reset
                  </Button>
                  <Button onClick={handleSave} loading={saveMutation.isPending}>
                    Save branding
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DoctorsManager() {
  const doctorsQuery = useQuery({
    queryKey: QUERY_KEYS.doctors,
    queryFn: async () => {
      try {
        return await tenantsService.listTenantDoctors();
      } catch (err) {
        if (isApiError(err) && err.status === 404) return [] as DoctorRead[];
        throw err;
      }
    },
  });
  const doctors = doctorsQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Doctors</CardTitle>
        <CardDescription>Read-only list of doctors assigned to this tenant.</CardDescription>
      </CardHeader>
      <CardContent>
        {doctorsQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : doctorsQuery.isError ? (
          <p className="text-sm text-destructive">{getErrorMessage(doctorsQuery.error)}</p>
        ) : doctors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No doctors assigned yet.</p>
        ) : (
          <StandardTable minWidthClass="min-w-[620px]">
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Licence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((doctor) => (
                <TableRow key={doctor.user_id}>
                  <TableCell>{doctor.user_id}</TableCell>
                  <TableCell>{doctor.specialization || "-"}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {doctor.licence_number || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={doctor.is_active ? "success" : "neutral"}>
                      {doctor.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(doctor.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </StandardTable>
        )}
      </CardContent>
    </Card>
  );
}

function TenantDepartmentsManager({ onSaved }: { onSaved: () => void }) {
  const queryClient = useQueryClient();

  const catalogQuery = useQuery({
    queryKey: QUERY_KEYS.departmentCatalog,
    queryFn: () => tenantsService.listDepartmentCatalog(),
  });
  const tenantDepartmentsQuery = useQuery({
    queryKey: QUERY_KEYS.departments,
    queryFn: async () => {
      try {
        return await tenantsService.listTenantDepartments();
      } catch (err) {
        if (isApiError(err) && err.status === 404) return [] as TenantDepartmentWithServicesRead[];
        throw err;
      }
    },
  });

  const [rows, setRows] = useState<DepartmentDraft[]>([]);
  const [servicesDept, setServicesDept] = useState<{ id: number; name: string } | null>(null);
  const [departmentFormOpen, setDepartmentFormOpen] = useState(false);
  const [departmentForm, setDepartmentForm] = useState<DepartmentFormModalState>(
    emptyDepartmentForm(),
  );
  const [editingDepartmentLocalId, setEditingDepartmentLocalId] = useState<string | null>(null);
  const [pendingDepartmentRemoval, setPendingDepartmentRemoval] =
    useState<DepartmentDraft | null>(null);

  useEffect(() => {
    if (!tenantDepartmentsQuery.data) return;
    setRows(tenantDepartmentsQuery.data.map(mapTenantDepartmentToDraft));
  }, [tenantDepartmentsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (items: DepartmentDraft[]) =>
      tenantsService.replaceTenantDepartments({
        items: items.map((row) => ({
          department_id: row.department_id as number,
          phone_number: nullIfBlank(row.phone_number),
          email: nullIfBlank(row.email),
          location: nullIfBlank(row.location),
        })),
      }),
    onSuccess: (data) => {
      toast.success("Departments updated");
      setRows(data.map(mapTenantDepartmentToDraft));
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.departments });
      onSaved();
    },
    onError: (err) => {
      toast.error("Failed to save departments", {
        description: getErrorMessage(err),
      });
    },
  });

  const validateRows = (candidateRows: DepartmentDraft[]): boolean => {
    const seen = new Set<number>();
    for (const row of candidateRows) {
      if (!row.department_id) {
        toast.error("Each department row must select a department");
        return false;
      }
      if (seen.has(row.department_id)) {
        toast.error("Duplicate department selected", {
          description: "Departments are bulk-replaced; each department can appear only once.",
        });
        return false;
      }
      seen.add(row.department_id);
    }
    return true;
  };

  const persistRows = (candidateRows: DepartmentDraft[]) => {
    if (!validateRows(candidateRows)) return false;
    saveMutation.mutate(candidateRows);
    return true;
  };

  const submitDepartmentModal = () => {
    if (!departmentForm.department_id) {
      toast.error("Please select a department");
      return;
    }
    if (
      rows.some(
        (row) =>
          row.department_id === departmentForm.department_id &&
          row.local_id !== editingDepartmentLocalId,
      )
    ) {
      toast.error("Duplicate department selected", {
        description: "Each department can appear only once.",
      });
      return;
    }
    const selected = catalogQuery.data?.find((d) => d.id === departmentForm.department_id) ?? null;
    const nextRows = editingDepartmentLocalId
      ? rows.map((row) =>
          row.local_id === editingDepartmentLocalId
            ? {
                ...row,
                department_id: departmentForm.department_id,
                department_name: selected?.name ?? "",
                phone_number: departmentForm.phone_number,
                email: departmentForm.email,
                location: departmentForm.location,
                isEditing: false,
              }
            : row,
        )
      : [
          ...rows,
          {
            local_id: createLocalId(),
            department_id: departmentForm.department_id,
            department_name: selected?.name ?? "",
            phone_number: departmentForm.phone_number,
            email: departmentForm.email,
            location: departmentForm.location,
            isEditing: false,
          },
        ];
    if (!persistRows(nextRows)) return;
    setDepartmentForm(emptyDepartmentForm());
    setEditingDepartmentLocalId(null);
    setDepartmentFormOpen(false);
  };

  const confirmRemoveRow = (localId: string) => {
    const nextRows = rows.filter((row) => row.local_id !== localId);
    if (!persistRows(nextRows)) return;
    setPendingDepartmentRemoval(null);
  };

  const loadError = catalogQuery.error ?? tenantDepartmentsQuery.error;
  const isLoading = catalogQuery.isLoading || tenantDepartmentsQuery.isLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Departments + Services</CardTitle>
          <CardDescription>
            Add, edit, and remove departments. Confirmed actions save immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : loadError ? (
            <p className="text-sm text-destructive">{getErrorMessage(loadError)}</p>
          ) : (
            <>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  disabled={saveMutation.isPending}
                  onClick={() => {
                    setEditingDepartmentLocalId(null);
                    setDepartmentForm(emptyDepartmentForm());
                    setDepartmentFormOpen(true);
                  }}
                >
                  + Add department
                </Button>
              </div>

              <StandardTable minWidthClass="min-w-[820px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="min-w-64">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No departments configured yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => {
                      const departmentName =
                        catalogQuery.data?.find((d) => d.id === row.department_id)?.name ||
                        row.department_name ||
                        "-";

                      return (
                        <TableRow key={row.local_id}>
                          <TableCell><span>{departmentName}</span></TableCell>
                          <TableCell><span className="text-sm">{row.phone_number || "-"}</span></TableCell>
                          <TableCell><span className="text-sm">{row.email || "-"}</span></TableCell>
                          <TableCell><span className="text-sm">{row.location || "-"}</span></TableCell>
                          <TableCell>
                            <RowActions>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!row.id || saveMutation.isPending}
                                onClick={() =>
                                  row.id
                                    ? setServicesDept({ id: row.id, name: departmentName })
                                    : undefined
                                }
                              >
                                View services
                              </Button>
                              <RowIconActionButton
                                mode="edit"
                                label="Edit department"
                                disabled={saveMutation.isPending}
                                onClick={() => {
                                  setEditingDepartmentLocalId(row.local_id);
                                  setDepartmentForm({
                                    department_id: row.department_id,
                                    phone_number: row.phone_number,
                                    email: row.email,
                                    location: row.location,
                                  });
                                  setDepartmentFormOpen(true);
                                }}
                              />
                              <RowIconActionButton
                                mode="delete"
                                label="Remove department"
                                disabled={saveMutation.isPending}
                                onClick={() => setPendingDepartmentRemoval(row)}
                              />
                            </RowActions>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </StandardTable>
              <p className="text-xs text-muted-foreground">
                Departments are saved automatically after Add, Edit, and Remove actions.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <ServicesModal
        open={!!servicesDept}
        tenantDepartmentId={servicesDept?.id ?? null}
        departmentName={servicesDept?.name ?? ""}
        onOpenChange={(open) => {
          if (!open) setServicesDept(null);
        }}
        onChanged={() => {
          void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.departments });
          onSaved();
        }}
      />

      <Dialog
        open={departmentFormOpen}
        onOpenChange={(open) => {
          setDepartmentFormOpen(open);
          if (!open) {
            setEditingDepartmentLocalId(null);
            setDepartmentForm(emptyDepartmentForm());
          }
        }}
      >
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDepartmentLocalId ? "Edit Department" : "Add Department"}</DialogTitle>
            <DialogDescription>
              {editingDepartmentLocalId
                ? "Update department details. Confirming this modal saves immediately."
                : "Add a department to your tenant. Confirming this modal saves immediately."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Field className="md:col-span-2">
              <Label htmlFor="dept-modal-select">Department</Label>
              <select
                id="dept-modal-select"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={departmentForm.department_id ?? ""}
                onChange={(e) =>
                  setDepartmentForm((s) => ({
                    ...s,
                    department_id: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              >
                <option value="">Select department</option>
                {(catalogQuery.data ?? []).map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <Label htmlFor="dept-modal-phone">Phone</Label>
              <Input
                id="dept-modal-phone"
                value={departmentForm.phone_number}
                onChange={(e) =>
                  setDepartmentForm((s) => ({ ...s, phone_number: e.target.value }))
                }
                placeholder="+1-555-1001"
              />
            </Field>
            <Field>
              <Label htmlFor="dept-modal-email">Email</Label>
              <Input
                id="dept-modal-email"
                type="email"
                value={departmentForm.email}
                onChange={(e) =>
                  setDepartmentForm((s) => ({ ...s, email: e.target.value }))
                }
                placeholder="dept@clinic.com"
              />
            </Field>
            <Field className="md:col-span-2">
              <Label htmlFor="dept-modal-location">Location</Label>
              <Input
                id="dept-modal-location"
                value={departmentForm.location}
                onChange={(e) =>
                  setDepartmentForm((s) => ({ ...s, location: e.target.value }))
                }
                placeholder="Building A"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={saveMutation.isPending}
              onClick={() => {
                setDepartmentFormOpen(false);
                setEditingDepartmentLocalId(null);
                setDepartmentForm(emptyDepartmentForm());
              }}
            >
              Cancel
            </Button>
            <Button loading={saveMutation.isPending} onClick={submitDepartmentModal}>
              {editingDepartmentLocalId ? "Save changes" : "Add department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pendingDepartmentRemoval}
        onOpenChange={(open) => {
          if (!open) setPendingDepartmentRemoval(null);
        }}
      >
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Remove Department?</DialogTitle>
            <DialogDescription>
              {pendingDepartmentRemoval
                ? `Remove "${pendingDepartmentRemoval.department_name || "selected department"}" from the list?`
                : "Remove this department from the list?"}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action saves immediately.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={saveMutation.isPending}
              onClick={() => setPendingDepartmentRemoval(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={saveMutation.isPending}
              onClick={() =>
                pendingDepartmentRemoval
                  ? confirmRemoveRow(pendingDepartmentRemoval.local_id)
                  : undefined
              }
            >
              Yes, remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ServicesModal({
  open,
  tenantDepartmentId,
  departmentName,
  onOpenChange,
  onChanged,
}: {
  open: boolean;
  tenantDepartmentId: number | null;
  departmentName: string;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [form, setForm] = useState<ServiceFormState>(emptyServiceForm());
  const [pendingServiceDelete, setPendingServiceDelete] = useState<ServiceLandingItem | null>(null);

  useEffect(() => {
    if (!open) {
      setMode(null);
      setEditingServiceId(null);
      setForm(emptyServiceForm());
      setPendingServiceDelete(null);
    }
  }, [open]);

  const servicesQuery = useQuery({
    queryKey: ["tenant-manager", "services", tenantDepartmentId],
    queryFn: () => tenantsService.listServices(tenantDepartmentId as number),
    enabled: open && !!tenantDepartmentId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { tenant_department_id: number; name: string; price: number; description?: string | null }) =>
      tenantsService.createService(payload),
    onSuccess: () => {
      toast.success("Service created");
      if (tenantDepartmentId) {
        void queryClient.invalidateQueries({
          queryKey: ["tenant-manager", "services", tenantDepartmentId],
        });
      }
      onChanged();
      setMode(null);
      setForm(emptyServiceForm());
    },
    onError: (err) => {
      toast.error("Failed to create service", {
        description: getErrorMessage(err),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ serviceId, payload }: { serviceId: number; payload: ServiceUpdateInput }) =>
      tenantsService.updateService(serviceId, payload),
    onSuccess: () => {
      toast.success("Service updated");
      if (tenantDepartmentId) {
        void queryClient.invalidateQueries({
          queryKey: ["tenant-manager", "services", tenantDepartmentId],
        });
      }
      onChanged();
      setMode(null);
      setEditingServiceId(null);
      setForm(emptyServiceForm());
    },
    onError: (err) => {
      toast.error("Failed to update service", {
        description: getErrorMessage(err),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (serviceId: number) => tenantsService.deleteService(serviceId),
    onSuccess: () => {
      toast.success("Service deleted");
      if (tenantDepartmentId) {
        void queryClient.invalidateQueries({
          queryKey: ["tenant-manager", "services", tenantDepartmentId],
        });
      }
      onChanged();
      setPendingServiceDelete(null);
    },
    onError: (err) => {
      toast.error("Failed to delete service", {
        description: getErrorMessage(err),
      });
    },
  });

  const startCreate = () => {
    setMode("create");
    setEditingServiceId(null);
    setForm(emptyServiceForm());
  };

  const startEdit = (service: ServiceLandingItem) => {
    setMode("edit");
    setEditingServiceId(service.id);
    setForm({
      name: service.name,
      price: String(service.price ?? ""),
      description: service.description ?? "",
      is_active: service.is_active,
    });
  };

  const closeServiceForm = () => {
    setMode(null);
    setEditingServiceId(null);
    setForm(emptyServiceForm());
  };

  const submit = () => {
    if (!tenantDepartmentId) return;
    const name = form.name.trim();
    const price = Number(form.price);
    if (!name) {
      toast.error("Service name is required");
      return;
    }
    if (!Number.isFinite(price)) {
      toast.error("Service price must be a valid number");
      return;
    }

    if (mode === "create") {
      createMutation.mutate({
        tenant_department_id: tenantDepartmentId,
        name,
        price,
        description: nullIfBlank(form.description),
      });
      return;
    }

    if (mode === "edit" && editingServiceId) {
      updateMutation.mutate({
        serviceId: editingServiceId,
        payload: {
          name,
          price,
          description: nullIfBlank(form.description),
          is_active: form.is_active,
        },
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{departmentName || "Department"} Services</DialogTitle>
          <DialogDescription>
            Manage services for this department. These changes appear under departments on the public landing page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {mode ? (
              <Badge variant="outline">
                {mode === "create" ? "Adding service" : "Editing service"}
              </Badge>
            ) : null}
            <Button variant="outline" onClick={startCreate} disabled={!tenantDepartmentId}>
              + Add service
            </Button>
          </div>

          <div className="max-h-[45vh] overflow-auto rounded-lg border">
            <StandardTable minWidthClass="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-0">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicesQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8">
                      <Skeleton className="h-12 w-full" />
                    </TableCell>
                  </TableRow>
                ) : servicesQuery.isError ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-destructive">
                      {getErrorMessage(servicesQuery.error)}
                    </TableCell>
                  </TableRow>
                ) : (servicesQuery.data?.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No services yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  (servicesQuery.data ?? []).map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{formatCurrency(service.price)}</TableCell>
                      <TableCell className="max-w-sm truncate text-muted-foreground">
                        {service.description || "-"}
                      </TableCell>
                      <TableCell>
                        <RowActions>
                          <RowIconActionButton
                            mode="edit"
                            label="Edit service"
                            onClick={() => startEdit(service)}
                          />
                          <RowIconActionButton
                            mode="delete"
                            label="Delete service"
                            onClick={() => setPendingServiceDelete(service)}
                          />
                        </RowActions>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </StandardTable>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open) closeServiceForm();
        }}
      >
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Add Service" : "Edit Service"}</DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Create a service for this department."
                : "Update service details for this department."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <Label htmlFor="service-name">Name</Label>
              <Input
                id="service-name"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="Initial Consultation"
              />
            </Field>
            <Field>
              <Label htmlFor="service-price">Price</Label>
              <Input
                id="service-price"
                value={form.price}
                onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
                placeholder="120.00"
                inputMode="decimal"
              />
            </Field>
            <Field className="md:col-span-2">
              <Label htmlFor="service-description">Description</Label>
              <textarea
                id="service-description"
                className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="First visit assessment"
              />
            </Field>
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <Checkbox
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((s) => ({ ...s, is_active: checked === true }))
                }
              />
              Active service
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeServiceForm}>
              Cancel
            </Button>
            <Button onClick={submit} loading={isSubmitting}>
              {mode === "create" ? "Create service" : "Save service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pendingServiceDelete}
        onOpenChange={(open) => {
          if (!open) setPendingServiceDelete(null);
        }}
      >
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delete Service?</DialogTitle>
            <DialogDescription>
              {pendingServiceDelete
                ? `Are you sure you want to delete "${pendingServiceDelete.name}"?`
                : "Are you sure you want to delete this service?"}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingServiceDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (pendingServiceDelete) {
                  deleteMutation.mutate(pendingServiceDelete.id);
                }
              }}
            >
              Yes, delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function ProductsManager({ onSaved }: { onSaved: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProductFormState>(emptyProductForm());
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [pendingProductDelete, setPendingProductDelete] = useState<ProductRead | null>(null);

  const productsQuery = useQuery({
    queryKey: QUERY_KEYS.products,
    queryFn: async () => {
      try {
        return await tenantsService.listTenantProducts();
      } catch (err) {
        if (isApiError(err) && err.status === 404) return [] as ProductRead[];
        throw err;
      }
    },
  });
  const products = productsQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: ProductCreateForTenant) => tenantsService.createTenantProduct(payload),
    onSuccess: () => {
      toast.success("Product created");
      closeProductModal();
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      onSaved();
    },
    onError: (err) => {
      toast.error("Failed to create product", {
        description: getErrorMessage(err),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: number;
      payload: ProductUpdateInput;
    }) => tenantsService.updateTenantProduct(productId, payload),
    onSuccess: () => {
      toast.success("Product updated");
      closeProductModal();
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      onSaved();
    },
    onError: (err) => {
      toast.error("Failed to update product", {
        description: getErrorMessage(err),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: number) => tenantsService.deleteTenantProduct(productId),
    onSuccess: () => {
      toast.success("Product deleted");
      setPendingProductDelete(null);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      onSaved();
    },
    onError: (err) => {
      toast.error("Failed to delete product", {
        description: getErrorMessage(err),
      });
    },
  });

  const openCreateModal = () => {
    setMode("create");
    setEditingProductId(null);
    setForm(emptyProductForm());
  };

  const openEditModal = (product: ProductRead) => {
    setMode("edit");
    setEditingProductId(product.product_id);
    setForm({
      name: product.name,
      description: product.description ?? "",
      price: String(product.price ?? ""),
      stock_quantity: String(product.stock_quantity ?? 0),
      is_available: product.is_available !== false,
    });
  };

  const closeProductModal = () => {
    setMode(null);
    setEditingProductId(null);
    setForm(emptyProductForm());
  };

  const parseProductForm = (): ProductCreateForTenant | null => {
    const name = form.name.trim();
    const price = Number(form.price);
    const stockQuantity = Number(form.stock_quantity);
    if (!name) {
      toast.error("Product name is required");
      return null;
    }
    if (!Number.isFinite(price)) {
      toast.error("Product price must be a valid number");
      return null;
    }
    if (!Number.isInteger(stockQuantity)) {
      toast.error("Stock quantity must be an integer");
      return null;
    }

    return {
      name,
      description: nullIfBlank(form.description),
      price,
      stock_quantity: stockQuantity,
      is_available: form.is_available,
    };
  };

  const submit = () => {
    const payload = parseProductForm();
    if (!payload) return;

    if (mode === "edit" && editingProductId !== null) {
      updateMutation.mutate({ productId: editingProductId, payload });
      return;
    }
    createMutation.mutate(payload);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Products</CardTitle>
        <CardDescription>
          Manage products shown on the tenant landing page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" onClick={openCreateModal} disabled={isSubmitting}>
            + Add product
          </Button>
        </div>

        {productsQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : productsQuery.isError ? (
          <p className="text-sm text-destructive">{getErrorMessage(productsQuery.error)}</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products added yet.</p>
        ) : (
          <StandardTable minWidthClass="min-w-[680px]">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Available</TableHead>
                <TableHead className="w-0">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.product_id}>
                  <TableCell>{product.product_id}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">
                    {product.description || "-"}
                  </TableCell>
                  <TableCell>{formatCurrency(Number(product.price))}</TableCell>
                  <TableCell>
                    <Badge variant={product.is_available ? "success" : "neutral"}>
                      {product.is_available ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <RowActions>
                      <RowIconActionButton
                        mode="edit"
                        label="Edit product"
                        onClick={() => openEditModal(product)}
                      />
                      <RowIconActionButton
                        mode="delete"
                        label="Delete product"
                        onClick={() => setPendingProductDelete(product)}
                      />
                    </RowActions>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </StandardTable>
        )}
      </CardContent>

      <Dialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open) closeProductModal();
        }}
      >
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === "edit" ? "Edit Product" : "Add Product"}</DialogTitle>
            <DialogDescription>
              {mode === "edit"
                ? "Update product details for this tenant."
                : "Create a new product for this tenant."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <Label htmlFor="product-name">Name</Label>
              <Input
                id="product-name"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="Vitamin D Supplement"
              />
            </Field>
            <Field>
              <Label htmlFor="product-price">Price</Label>
              <Input
                id="product-price"
                value={form.price}
                onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
                placeholder="25.00"
                inputMode="decimal"
              />
            </Field>
            <Field>
              <Label htmlFor="product-stock">Stock Quantity</Label>
              <Input
                id="product-stock"
                value={form.stock_quantity}
                onChange={(e) =>
                  setForm((s) => ({ ...s, stock_quantity: e.target.value }))
                }
                placeholder="0"
                inputMode="numeric"
              />
            </Field>
            <Field>
              <Label htmlFor="product-description">Description</Label>
              <Input
                id="product-description"
                value={form.description}
                onChange={(e) =>
                  setForm((s) => ({ ...s, description: e.target.value }))
                }
                placeholder="Daily supplement"
              />
            </Field>
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <Checkbox
                checked={form.is_available}
                onCheckedChange={(checked) =>
                  setForm((s) => ({ ...s, is_available: checked === true }))
                }
              />
              Available on landing page
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeProductModal}>
              Cancel
            </Button>
            <Button onClick={submit} loading={isSubmitting}>
              {mode === "edit" ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pendingProductDelete}
        onOpenChange={(open) => {
          if (!open) setPendingProductDelete(null);
        }}
      >
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delete Product?</DialogTitle>
            <DialogDescription>
              {pendingProductDelete
                ? `Are you sure you want to delete "${pendingProductDelete.name}"?`
                : "Are you sure you want to delete this product?"}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingProductDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (pendingProductDelete) {
                  deleteMutation.mutate(pendingProductDelete.product_id);
                }
              }}
            >
              Yes, delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function StandardTable({
  children,
  minWidthClass = "min-w-[700px]",
}: {
  children: ReactNode;
  minWidthClass?: string;
}) {
  return <Table className={minWidthClass}>{children}</Table>;
}

function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-nowrap items-center gap-2">{children}</div>;
}

function RowIconActionButton({
  mode,
  label,
  onClick,
  disabled,
}: {
  mode: "edit" | "delete";
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant={mode === "delete" ? "destructive" : "ghost"}
      size="icon-sm"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {mode === "delete" ? <IconTrash /> : <IconPencil />}
    </Button>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function Field({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={["space-y-2", className].filter(Boolean).join(" ")}>{children}</div>;
}

function emptyDetailsForm(): TenantDetailsFormState {
  return {
    logo: "",
    image: "",
    moto: "",
    title: "",
    about_text: "",
    brand_id: null,
    font_id: null,
  };
}

function mapDetailsToForm(details: TenantDetailsRead | null): TenantDetailsFormState {
  return {
    logo: details?.logo ?? "",
    image: details?.image ?? "",
    moto: details?.moto ?? "",
    title: details?.title ?? "",
    about_text: details?.about_text ?? "",
    brand_id: details?.brand_id ?? null,
    font_id: details?.font_id ?? null,
  };
}

function diffTenantDetailsPayload(
  form: TenantDetailsFormState,
  original: TenantDetailsRead | null,
): TenantDetailsUpdate {
  const payload: TenantDetailsUpdate = {};
  const current = {
    logo: nullIfBlank(form.logo),
    image: nullIfBlank(form.image),
    moto: nullIfBlank(form.moto),
    title: nullIfBlank(form.title),
    about_text: nullIfBlank(form.about_text),
    brand_id: form.brand_id,
    font_id: form.font_id,
  };

  if ((original?.logo ?? null) !== current.logo) payload.logo = current.logo;
  if ((original?.image ?? null) !== current.image) payload.image = current.image;
  if ((original?.moto ?? null) !== current.moto) payload.moto = current.moto;
  if ((original?.title ?? null) !== current.title) payload.title = current.title;
  if ((original?.about_text ?? null) !== current.about_text) {
    payload.about_text = current.about_text;
  }
  if ((original?.brand_id ?? null) !== current.brand_id) payload.brand_id = current.brand_id;
  if ((original?.font_id ?? null) !== current.font_id) payload.font_id = current.font_id;

  return payload;
}

function mapTenantDepartmentToDraft(item: TenantDepartmentWithServicesRead): DepartmentDraft {
  return {
    local_id: createLocalId(),
    id: item.id,
    department_id: item.department_id,
    department_name: item.department_name,
    phone_number: item.phone_number ?? "",
    email: item.email ?? "",
    location: item.location ?? "",
    isEditing: false,
  };
}

function emptyProductForm(): ProductFormState {
  return {
    name: "",
    description: "",
    price: "",
    stock_quantity: "0",
    is_available: true,
  };
}

function emptyDepartmentForm(): DepartmentFormModalState {
  return {
    department_id: null,
    phone_number: "",
    email: "",
    location: "",
  };
}

function emptyServiceForm(): ServiceFormState {
  return {
    name: "",
    price: "",
    description: "",
    is_active: true,
  };
}

function nullIfBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function createLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getErrorMessage(err: unknown): string {
  if (isApiError(err)) return err.displayMessage;
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}
