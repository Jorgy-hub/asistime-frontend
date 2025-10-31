"use client";

import { useEffect, useMemo, useState } from "react";
import { createUser, listUsers, updateUser, deleteUser, type User } from "../../lib/usersApi";
import { useAuth } from "@/context/AuthProvider";

type FormState = {
  username: string;
  password?: string;
  admin: boolean;
  permissions: string[];
};

const KNOWN_PERMS = ["Maestro", "RH"];

function toErrorMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in (e as any)) return String((e as any).message);
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export default function AdminUsersManager({ token }: { token?: string }) {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [debugError, setDebugError] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);

  // búsqueda + paginación
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // modal (crear/editar)
  const [open, setOpen] = useState<null | "create" | "edit">(null);
  const [form, setForm] = useState<FormState>({ username: "", password: "", admin: false, permissions: [] });
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // animaciones modal formulario
  const [formMounted, setFormMounted] = useState(false);
  const [formVisible, setFormVisible] = useState(false);

  // confirmación de borrado (datos + animación)
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [confirmMounted, setConfirmMounted] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const reload = async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (e) {
      setErr(toErrorMessage(e));
      setDebugError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => (u.username || "").toLowerCase().includes(s));
  }, [users, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    setPage(1);
  }, [q, users.length]);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, filtered.length);
  const pageItems = filtered.slice(start, end);

  // contar administradores para proteger al último
  const totalAdmins = useMemo(() => users.filter((u) => u.admin).length, [users]);

  // usuarios protegidos (no se pueden eliminar)
  const isProtectedUser = (u: User) => {
    const uname = (u?.username || "").trim().toLowerCase();
    const current = (currentUser as any)?.username ? String((currentUser as any).username).trim().toLowerCase() : "";
    if (uname === "administrador") return true;
    if (current && uname === current) return true;
    if (u.admin && totalAdmins <= 1) return true; // no se puede eliminar al último admin
    return false;
  };

  // abrir/cerrar modal formulario con animación
  const openFormModal = (mode: "create" | "edit") => {
    setOpen(mode);
    setFormMounted(true);
    requestAnimationFrame(() => setFormVisible(true));
  };
  const closeFormModal = () => {
    setFormVisible(false);
    setTimeout(() => {
      setFormMounted(false);
      setOpen(null);
      setEditingId(null);
      setEditingUser(null);
    }, 200);
  };

  // abrir/cerrar modal confirmación con animación
  const openConfirmModal = (u: User) => {
    setConfirmUser(u);
    setConfirmMounted(true);
    requestAnimationFrame(() => setConfirmVisible(true));
  };
  const closeConfirmModal = () => {
    setConfirmVisible(false);
    setTimeout(() => {
      setConfirmMounted(false);
      setConfirmUser(null);
    }, 200);
  };

  const onOpenCreate = () => {
    setForm({ username: "", password: "", admin: false, permissions: [] });
    setEditingId(null);
    setEditingUser(null);
    setErr(null);
    setMessage(null);
    setDebugError(null);
    openFormModal("create");
  };

  const onOpenEdit = (u: User) => {
    setForm({
      username: u.username,
      password: "",
      admin: !!u.admin,
      permissions: Array.isArray(u.permissions) ? [...u.permissions] : [],
    });
    setEditingId((u as any).id ?? u.username);
    setEditingUser(u);
    setErr(null);
    setMessage(null);
    setDebugError(null);
    openFormModal("edit");
  };

  const onDelete = (u: User) => {
    if (isProtectedUser(u)) {
      setErr(`No puedes eliminar "${u.username}".`);
      return;
    }
    openConfirmModal(u);
  };

  const handleConfirmDelete = async () => {
    if (!confirmUser) return;
    if (isProtectedUser(confirmUser)) {
      setErr(`No puedes eliminar "${confirmUser.username}".`);
      closeConfirmModal();
      return;
    }
    const id = (confirmUser as any).id ?? confirmUser.username;
    try {
      setSubmitting(true);
      await deleteUser(id);
      setMessage(`Usuario "${confirmUser.username}" eliminado`);
      closeConfirmModal();
      await reload();
    } catch (e) {
      setErr(`No se pudo eliminar el usuario: ${toErrorMessage(e)}`);
      setDebugError(e);
      closeConfirmModal();
    } finally {
      setSubmitting(false);
    }
  };

  const togglePerm = (p: string) => {
    setForm((f) => {
      const has = f.permissions.includes(p);
      return { ...f, permissions: has ? f.permissions.filter((x) => x !== p) : [...f.permissions, p] };
    });
  };
  const addPerm = (p: string) => {
    const v = p.trim();
    if (!v) return;
    setForm((f) => (f.permissions.includes(v) ? f : { ...f, permissions: [...f.permissions, v] }));
  };
  const removePerm = (p: string) => {
    setForm((f) => ({ ...f, permissions: f.permissions.filter((x) => x !== p) }));
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    setDebugError(null);

    const username = (form.username || "").trim();
    const password = form.password || "";
    const permissions = Array.from(new Set(form.permissions.map((s) => s.trim()).filter(Boolean)));
    const payload = { username, ...(password ? { password } : {}), admin: form.admin, permissions };

    if (!username) {
      setErr("El nombre de usuario es obligatorio");
      setSubmitting(false);
      return;
    }
    if (open === "create" && !password) {
      setErr("La contraseña es obligatoria");
      setSubmitting(false);
      return;
    }

    // Evitar degradar tu propio usuario, al “administrador” o al último admin
    const editUname = (editingUser?.username || "").trim().toLowerCase();
    const curUname = ((currentUser as any)?.username || "").trim().toLowerCase();
    const isSelfEdit = !!editingUser && editUname === curUname;
    const isSuperEdit = !!editingUser && editUname === "administrador";
    const demoteBlocked = open === "edit" && editingUser?.admin && !form.admin && (isSelfEdit || isSuperEdit || totalAdmins <= 1);
    if (demoteBlocked) {
      setErr(
        isSuperEdit
          ? 'El superusuario "administrador" no puede ser degradado.'
          : isSelfEdit
          ? "No puedes quitar tu propio rol de administrador."
          : "Se requiere al menos un administrador."
      );
      setSubmitting(false);
      return;
    }

    try {
      if (open === "create") {
        await createUser({ username, password, admin: form.admin, permissions });
        setMessage(`Usuario "${username}" creado`);
      } else if (open === "edit" && editingId != null) {
        await updateUser(editingId, {
          username,
          password: password || "", // el backend requiere el campo; "" => mantener actual
          admin: form.admin,
          permissions,
          refresh_token: null,
        });
        setMessage(`Usuario "${username}" actualizado`);
      }
      closeFormModal();
      await reload();
    } catch (e) {
      setErr(`No se pudo guardar: ${toErrorMessage(e)}`);
      setDebugError(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full px-4 py-4">
      {/* Encabezado */}
      <div className="mb-6">
        <div className="mt-1 flex items-end justify-between">
          <h1 className="text-xl font-semibold text-zinc-100">Lista de usuarios</h1>
          {message && <div className="text-xs px-3 py-1 rounded-md bg-emerald-600/15 text-emerald-300">{message}</div>}
        </div>
        {err && (
          <div className="mt-3 text-xs px-3 py-2 rounded-md bg-rose-600/15 text-rose-300">
            {err}
            {debugError && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] text-zinc-400">detalles</summary>
                <pre className="text-[10px] text-zinc-300 whitespace-pre-wrap break-all">
                  {(() => {
                    try {
                      return JSON.stringify(debugError, Object.getOwnPropertyNames(debugError), 2);
                    } catch {
                      return String(debugError);
                    }
                  })()}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Tarjeta principal sin bordes */}
      <div className="rounded-2xl bg-zinc-950/40 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Toolbar sin bordes */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-4">
          <button
            onClick={onOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-lg bg-amber-500 hover:bg-amber-600 text-sm font-medium text-white shadow-inner shadow-amber-900/20"
          >
            <span className="-ml-1 inline-flex h-5 w-5 items-center justify-center rounded-md bg-amber-600/40">+</span>
            Nuevo usuario
          </button>

          <div className="relative w-full sm:w-80">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
              </svg>
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-zinc-900 outline-none text-sm text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
        </div>

        {/* Tabla con alternancia zinc-900/zinc-800 y sin divisores */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-zinc-300">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Usuario</th>
                <th className="text-left px-4 py-3 font-medium">Administrador</th>
                <th className="text-left px-4 py-3 font-medium">Permisos</th>
                <th className="text-right px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-zinc-400">
                    Cargando…
                  </td>
                </tr>
              )}
              {!loading && pageItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-zinc-400">
                    No hay usuarios
                  </td>
                </tr>
              )}
              {!loading &&
                pageItems.map((u, idx) => (
                  <tr
                    key={(u as any).id ?? u.username}
                    className={`${idx % 2 === 0 ? "bg-zinc-800/40" : "bg-zinc-900/40"} transition-colors hover:bg-zinc-700/60`}
                  >
                    <td className="px-4 py-3 text-zinc-100">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-400/90" />
                        <span>{u.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          u.admin ? "bg-emerald-600/20 text-emerald-300" : "bg-zinc-700/40 text-zinc-300"
                        }`}
                      >
                        <span className={`inline-block h-2 w-2 rounded-full ${u.admin ? "bg-emerald-400" : "bg-zinc-500"}`} />
                        {u.admin ? "Sí" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {u.permissions?.length ? (
                          u.permissions.map((p) => (
                            <span key={p} className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-[11px]">
                              {p}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-500 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenEdit(u)}
                          className="inline-flex items-center justify-center h-9 w-9 rounded-md bg-zinc-800/60 hover:bg-zinc-700 text-zinc-200"
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.25 2.25 0 1 1 3.182 3.182L8.622 19.09 4.5 19.5l.41-4.123L16.862 4.487Z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(u)}
                          disabled={submitting || isProtectedUser(u)}
                          title={isProtectedUser(u) ? "Este usuario no se puede eliminar" : "Eliminar"}
                          className="inline-flex items-center justify-center h-9 w-9 rounded-md bg-zinc-800/60 hover:bg-zinc-700 disabled:opacity-50 text-rose-300"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12m-9 0V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2m-7 0l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Paginación sin bordes */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 text-xs text-zinc-400">
            <div>
              Mostrando {start + 1}–{end} de {filtered.length}
            </div>
            <div className="flex items-center gap-1">
              <button className="px-2 py-1 rounded-md bg-zinc-900 disabled:opacity-40" onClick={() => setPage(1)} disabled={page === 1}>
                «
              </button>
              <button
                className="px-2 py-1 rounded-md bg-zinc-900 disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </button>
              <span className="px-2 text-zinc-300">
                {page} / {pageCount}
              </span>
              <button
                className="px-2 py-1 rounded-md bg-zinc-900 disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page === pageCount}
              >
                Siguiente
              </button>
              <button className="px-2 py-1 rounded-md bg-zinc-900 disabled:opacity-40" onClick={() => setPage(pageCount)} disabled={page === pageCount}>
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: crear/editar con animación */}
      {formMounted && (
        <div
          className={`fixed inset-0 z-40 flex items-center justify-center transition-opacity duration-200 ${formVisible ? "opacity-100" : "opacity-0"}`}
          onClick={closeFormModal}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className={`relative w-full max-w-md rounded-2xl bg-zinc-900 p-5 shadow-xl transform transition-all duration-200 ease-out ${
              formVisible ? "opacity-100 translate-y-0 sm:scale-100" : "opacity-0 translate-y-3 sm:scale-95"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] text-zinc-400">{open === "create" ? "Usuarios / Nuevo" : "Usuarios / Editar"}</div>
                <h3 className="text-base font-semibold text-zinc-100">{open === "create" ? "Agregar usuario" : "Editar usuario"}</h3>
              </div>
              <button onClick={closeFormModal} className="text-zinc-400 hover:text-zinc-200">✕</button>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Usuario</label>
                <input
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full bg-zinc-800 focus:ring-2 focus:ring-amber-500/30 outline-none rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">{open === "create" ? "Contraseña" : "Nueva contraseña (opcional)"}</label>
                <input
                  type="password"
                  required={open === "create"}
                  value={form.password || ""}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-zinc-800 focus:ring-2 focus:ring-amber-500/30 outline-none rounded-lg px-3 py-2 text-sm"
                  placeholder={open === "create" ? "" : "Deja en blanco para mantener la actual"}
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.admin}
                  onChange={(e) => {
                    const next = e.target.checked;
                    if (!next && editingUser?.admin) {
                      const editUname = (editingUser?.username || "").trim().toLowerCase();
                      const curUname = ((currentUser as any)?.username || "").trim().toLowerCase();
                      const isSelfEdit = editUname === curUname;
                      const isSuperEdit = editUname === "administrador";
                      const demoteBlocked = isSelfEdit || isSuperEdit || totalAdmins <= 1;
                      if (demoteBlocked) {
                        setErr(
                          isSuperEdit
                            ? 'El superusuario "administrador" no puede ser degradado.'
                            : isSelfEdit
                            ? "No puedes quitar tu propio rol de administrador."
                            : "Se requiere al menos un administrador."
                        );
                        return;
                      }
                    }
                    setForm({ ...form, admin: next });
                  }}
                  className="h-4 w-4 accent-amber-500"
                  title={
                    !form.admin
                      ? "Conceder administrador"
                      : editingUser?.admin && (totalAdmins <= 1 || (editingUser?.username || "").trim().toLowerCase() === "administrador")
                      ? "No puedes quitar el rol al último administrador o al superusuario"
                      : ""
                  }
                />
                <span className="text-xs text-zinc-300">Administrador</span>
              </label>

              <div>
                <div className="text-[11px] text-zinc-400 mb-2">Permisos</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {Array.from(new Set([...KNOWN_PERMS, ...form.permissions])).map((p) => {
                    const checked = form.permissions.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePerm(p)}
                        className={`px-2 py-1 rounded-md text-xs ${
                          checked ? "bg-emerald-600/20 text-emerald-300" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700/70"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                {form.permissions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {form.permissions.map((p) => (
                      <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-[11px] text-zinc-200">
                        {p}
                        <button type="button" onClick={() => removePerm(p)} className="text-zinc-400 hover:text-zinc-200">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <button type="submit" disabled={submitting} className="bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-sm font-medium px-4 py-2 rounded-lg">
                  {submitting ? "Guardando..." : "Guardar"}
                </button>
                <button type="button" onClick={closeFormModal} className="bg-zinc-700 hover:bg-zinc-600 text-sm font-medium px-4 py-2 rounded-lg">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación de borrado con animación */}
      {confirmMounted && confirmUser && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${confirmVisible ? "opacity-100" : "opacity-0"}`}
          onClick={closeConfirmModal}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className={`relative w-full max-w-sm rounded-2xl bg-zinc-900 p-5 shadow-xl transform transition-all duration-200 ease-out ${
              confirmVisible ? "opacity-100 translate-y-0 sm:scale-100" : "opacity-0 translate-y-3 sm:scale-95"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-zinc-100">Eliminar usuario</h3>
            <p className="mt-2 text-sm text-zinc-300">¿Seguro que quieres eliminar “{confirmUser.username}”? Esta acción no se puede deshacer.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={closeConfirmModal} className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-sm text-white"
              >
                {submitting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PermInput({ onAdd }: { onAdd: (p: string) => void }) {
  const [val, setVal] = useState("");
  const onKey: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAdd(val);
      setVal("");
    }
  };
  return (
    <div className="flex gap-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={onKey}
        placeholder="Agrega un permiso y presiona Enter (p. ej., Maestro)"
        className="flex-1 bg-zinc-800 rounded-lg px-2 py-2 text-xs placeholder-zinc-500 focus:ring-2 focus:ring-amber-500/30 outline-none"
      />
      <button
        type="button"
        onClick={() => {
          onAdd(val);
          setVal("");
        }}
        className="text-xs px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600"
      >
        Agregar
      </button>
    </div>
  );
}