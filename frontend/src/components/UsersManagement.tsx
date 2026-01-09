import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

interface User {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  created_at: string;
}

const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    checkRoleAndFetchUsers();
  }, []);

  const checkRoleAndFetchUsers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No autenticado");

      // Obtener rol del usuario actual
      const { data: currentUser } = await supabase
        .from("users")
        .select("rol")
        .eq("id", user.id)
        .single();

      setUserRole(currentUser?.rol || "");

      // Solo permitir a superadmin y admin ver todos los usuarios
      if (currentUser?.rol === "superadmin" || currentUser?.rol === "admin") {
        const { data, error: fetchError } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        // Si es admin, filtrar usuarios superadmin (no puede verlos ni gestionarlos)
        let filteredUsers = data || [];
        if (currentUser?.rol === "admin") {
          filteredUsers = filteredUsers.filter(u => u.rol !== "superadmin");
        }

        setUsers(filteredUsers);
      } else {
        throw new Error("No tienes permiso para acceder a esta sección");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Eliminar este usuario? Esta acción es irreversible.")) return;

    try {
      // Eliminar de tabla users (el usuario en auth.users se elimina por ON DELETE CASCADE)
      const { error: deleteError } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (deleteError) throw deleteError;

      setUsers(users.filter(u => u.id !== userId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const { error: updateError } = await supabase
        .from("users")
        .update({ rol: newRole })
        .eq("id", userId);

      if (updateError) throw updateError;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, rol: newRole } : u
      ));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-center text-gray-500">Cargando usuarios...</p>
      </div>
    );
  }

  if (error && error.includes("No tienes permiso")) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-center text-red-600 font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
        <p className="text-gray-600 text-sm mt-1">Total de usuarios: {users.length}</p>
      </div>

      {error && error && !error.includes("No tienes permiso") && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Rol</th>
              <th className="px-4 py-2 text-left">Fecha Registro</th>
              <th className="px-4 py-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">{user.nombre}</td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">
                  {userRole === "superadmin" ? (
                    <select
                      value={user.rol}
                      onChange={(e) => handleChangeRole(user.id, e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded bg-white text-sm capitalize"
                    >
                      <option value="cliente">Cliente</option>
                      <option value="vendedor">Vendedor</option>
                      <option value="gerente">Gerente</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">SuperAdmin</option>
                    </select>
                  ) : userRole === "admin" ? (
                    <select
                      value={user.rol}
                      onChange={(e) => handleChangeRole(user.id, e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded bg-white text-sm capitalize"
                      disabled={user.rol === "admin" || user.rol === "superadmin"}
                    >
                      <option value="cliente">Cliente</option>
                      <option value="vendedor">Vendedor</option>
                      <option value="gerente">Gerente</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className="capitalize font-semibold">{user.rol}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-sm">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2">
                  {(userRole === "superadmin" || userRole === "admin") && user.rol !== "superadmin" && (
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-800 font-semibold text-sm"
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <p className="text-center text-gray-500 mt-4">No hay usuarios registrados</p>
      )}
    </div>
  );
};

export default UsersManagement;
