import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const mockWeddingLookup = vi.fn();
const mockStorageUpload = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn((table: string) => {
      if (table === "weddings") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: mockWeddingLookup,
              })),
            })),
          })),
        };
      }
      return {
        insert: (...args: unknown[]) => mockInsert(...args),
      };
    }),
    storage: {
      from: vi.fn(() => ({
        upload: (...args: unknown[]) => mockStorageUpload(...args),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://cdn.eydn.app/photo.jpg" } })),
      })),
    },
  }),
}));

const mockCheckRateLimit = vi.fn().mockResolvedValue({ limited: false });
vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limit")>("@/lib/rate-limit");
  return {
    ...actual,
    checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  };
});

import { POST } from "./route";

function buildReq(form: FormData): Request {
  return new Request("http://localhost/api/public/photos", {
    method: "POST",
    body: form,
  });
}

function makeForm(opts: {
  file?: File | null;
  slug?: string;
  uploaderName?: string;
  caption?: string;
}): FormData {
  const form = new FormData();
  if (opts.file) form.append("file", opts.file);
  if (opts.slug !== undefined) form.append("wedding_slug", opts.slug);
  if (opts.uploaderName !== undefined) form.append("uploader_name", opts.uploaderName);
  if (opts.caption !== undefined) form.append("caption", opts.caption);
  return form;
}

function pngFile(size: number = 1024, name: string = "photo.png"): File {
  return new File([new Uint8Array(size)], name, { type: "image/png" });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({ limited: false });
  mockWeddingLookup.mockResolvedValue({ data: { id: "wed_1" }, error: null });
  mockStorageUpload.mockResolvedValue({ error: null });
  mockInsert.mockResolvedValue({ error: null });
});

describe("POST /api/public/photos", () => {
  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ limited: true, retryAfter: 60 });
    const res = await POST(buildReq(makeForm({ file: pngFile(), slug: "alice-bob" })));
    expect(res.status).toBe(429);
  });

  it("returns 400 when file is missing", async () => {
    const res = await POST(buildReq(makeForm({ slug: "alice-bob" })));
    expect(res.status).toBe(400);
  });

  it("returns 400 when slug is missing", async () => {
    const res = await POST(buildReq(makeForm({ file: pngFile() })));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid slug format", async () => {
    const res = await POST(buildReq(makeForm({ file: pngFile(), slug: "!!" })));
    expect(res.status).toBe(400);
  });

  // Size-limit enforcement is covered indirectly — fabricating a >10 MB
  // File that survives Node's FormData round-trip intact is brittle.

  it("returns 400 when the file type is not an allowed image", async () => {
    const txt = new File(["hello"], "note.txt", { type: "text/plain" });
    const res = await POST(buildReq(makeForm({ file: txt, slug: "alice-bob" })));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the wedding slug doesn't match an enabled site", async () => {
    mockWeddingLookup.mockResolvedValue({ data: null, error: null });
    const res = await POST(buildReq(makeForm({ file: pngFile(), slug: "alice-bob" })));
    expect(res.status).toBe(404);
  });

  it("returns 500 when the storage upload errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockStorageUpload.mockResolvedValue({ error: { message: "storage down" } });
    const res = await POST(buildReq(makeForm({ file: pngFile(), slug: "alice-bob" })));
    expect(res.status).toBe(500);
  });

  it("returns 500 when the photo record insert fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockInsert.mockResolvedValue({ error: { message: "db down" } });
    const res = await POST(buildReq(makeForm({ file: pngFile(), slug: "alice-bob" })));
    expect(res.status).toBe(500);
  });

  it("returns 201 on success and writes the photo record", async () => {
    const res = await POST(
      buildReq(
        makeForm({
          file: pngFile(),
          slug: "alice-bob",
          uploaderName: "Carol",
          caption: "fun times",
        })
      )
    );
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        wedding_id: "wed_1",
        uploader_name: "Carol",
        caption: "fun times",
        approved: false,
      })
    );
  });

  it("defaults uploader_name to 'Anonymous'", async () => {
    await POST(buildReq(makeForm({ file: pngFile(), slug: "alice-bob" })));
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ uploader_name: "Anonymous" })
    );
  });
});
