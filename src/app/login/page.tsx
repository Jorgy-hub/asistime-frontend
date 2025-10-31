"use client";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthProvider";
import { useRouter } from "next/navigation";
import ErrorModal from "../../components/modals/error.modal";

export default function LoginPage() {
  const { token, setToken, setUser } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorModal, setErrorModal] = useState(false);

  useEffect(() => {
    if (token) router.replace("/panel");
  }, [token, router]);

  const handleLogin = useCallback(
    async (username: string, password: string) => {
      try {
        const authToken = (await invoke("login", { username, password })) as string;
        setToken(authToken);
        const user = await invoke("get_user", { authToken });
        setUser(user);
        router.replace("/panel");
      } catch {
        setErrorModal(true);
      }
    },
    [router, setToken, setUser]
  );

  // Login on Enter
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleLogin(username, password);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [username, password, handleLogin]);

  const togglePasswordVisibility = () => {
    const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]');
    if (!passwordInput) return;
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
  };

  return (
    <>
      {errorModal && (
        <ErrorModal updateCloseState={setErrorModal}>
          Acceso Negado, verifica los datos de acceso.
        </ErrorModal>
      )}
      <div className="bg-[url(/images/bg2.jpg)] bg-cover bg-center">
        <div className="min-h-screen flex flex-col items-center justify-center py-6 px-4">
          <div className="max-w-[480px] w-full">
            <div className="p-6 sm:p-8 rounded-2xl shadow-2xl justify-between bg-gradient-to-b from-zinc-900 to-zinc-950">
              <h1 className="text-white text-center text-3xl font-semibold m-5">Ingresar</h1>
              <form className="mt-6 space-y-6">
                {/* Username Input */}
                <div>
                  <label className="text-white text-sm font-bold mb-2 block select-none">
                    Usuario
                  </label>
                  <div className="relative flex items-center select-none">
                    <input
                      name="username"
                      type="text"
                      required
                      className="w-full text-white text-sm border border-slate-300 px-4 py-3 pr-8 rounded-md outline-blue-600"
                      placeholder="Ingresar nombre de usuario"
                      onChange={(e) => setUsername(e.target.value)}
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="#bbb"
                      stroke="#bbb"
                      className="w-4 h-4 absolute right-4"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="10" cy="7" r="6" />
                      <path d="M14 15H6a5 5 0 0 0-5 5 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 5 5 0 0 0-5-5zm8-4h-2.59l.3-.29a1 1 0 0 0-1.42-1.42l-2 2a1 1 0 0 0 0 1.42l2 2a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.42l-.3-.29H22a1 1 0 0 0 0-2z" />
                    </svg>
                  </div>
                </div>
                {/* Password Input */}
                <div>
                  <label className="text-white text-sm font-bold mb-2 block select-none">
                    Contraseña
                  </label>
                  <div className="relative flex items-center select-none">
                    <input
                      name="password"
                      type="password"
                      required
                      className="w-full text-white text-sm border border-slate-300 px-4 py-3 pr-8 rounded-md outline-blue-600"
                      placeholder="Ingresar contraseña"
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <svg
                      onClick={togglePasswordVisibility}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="#bbb"
                      stroke="#bbb"
                      className="w-4 h-4 absolute right-4 cursor-pointer"
                      viewBox="0 0 128 128"
                    >
                      <path d="M64 104C22.127 104 1.367 67.496.504 65.943a4 4 0 0 1 0-3.887C1.367 60.504 22.127 24 64 24s62.633 36.504 63.496 38.057a4 4 0 0 1 0 3.887C126.633 67.496 105.873 104 64 104zM8.707 63.994C13.465 71.205 32.146 96 64 96c31.955 0 50.553-24.775 55.293-31.994C114.535 56.795 95.854 32 64 32 32.045 32 13.447 56.775 8.707 63.994zM64 88c-13.234 0-24-10.766-24-24s10.766-24 24-24 24 10.766 24 24-10.766 24-24 24zm0-40c-8.822 0-16 7.178-16 16s7.178 16 16 16 16-7.178 16-16-7.178-16-16-16z" />
                    </svg>
                  </div>
                </div>
                {/* Forgot Password Link */}
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <div className="text-sm">
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="text-amber-400 hover:underline font-semibold"
                    >
                      Olvidaste tu contraseña?
                    </a>
                  </div>
                </div>
                {/* Submit Button */}
                <div className="!mt-12">
                  <button
                    onClick={() => handleLogin(username, password)}
                    type="button"
                    className="w-full py-2 px-4 text-[15px] font-bold tracking-wide rounded-md text-white focus:outline-none cursor-pointer bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600"
                  >
                    Ingresar
                  </button>
                </div>
                <p className="text-white text-sm !mt-6 text-center">
                  No tienes una cuenta?{" "}
                  <a className="text-amber-400 hover:underline ml-1 whitespace-nowrap font-semibold">
                    Reportate con Informática
                  </a>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}