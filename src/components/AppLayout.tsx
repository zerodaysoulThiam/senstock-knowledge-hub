import { Outlet, useNavigate } from "react-router-dom";
import AppSidebar from "./AppSidebar";

const AppLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar onLogout={handleLogout} />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
