import React from "react";

type PermissionsFormProps = {
  permissions: {
    teacher: boolean;
    hr: boolean;
  };
  onChange: (updatedPermissions: { teacher: boolean; hr: boolean }) => void;
};

const PermissionsForm: React.FC<PermissionsFormProps> = ({ permissions, onChange }) => {
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    onChange({ ...permissions, [name]: checked });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-100">Permissions</h3>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="teacher"
          checked={permissions.teacher}
          onChange={handleCheckboxChange}
          className="h-4 w-4 accent-amber-500"
        />
        <span className="text-xs text-zinc-300">Teacher</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="hr"
          checked={permissions.hr}
          onChange={handleCheckboxChange}
          className="h-4 w-4 accent-amber-500"
        />
        <span className="text-xs text-zinc-300">HR</span>
      </label>
    </div>
  );
};

export default PermissionsForm;