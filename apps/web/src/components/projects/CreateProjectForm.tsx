"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * T057: Create project creation form UI component
 * Form for creating new projects with integration selection
 */

export interface CreateProjectFormProps {
  orgId: string;
}

export function CreateProjectForm({ orgId }: CreateProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    integrations: {
      github: true,
      cloudflare: true,
      neon: true,
      postman: true,
      codespaces: true,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          orgId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to create project");
      }

      const project = await response.json();
      router.push(`/projects/${project.projectId}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Project Name
        </label>
        <input
          id="name"
          type="text"
          required
          minLength={3}
          maxLength={64}
          value={formData.name}
          onChange={(e) => {
            const name = e.target.value;
            setFormData({
              ...formData,
              name,
              slug: generateSlug(name),
            });
          }}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="My Awesome Project"
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
          Project Slug
        </label>
        <input
          id="slug"
          type="text"
          required
          pattern="^[a-z0-9-]+$"
          value={formData.slug}
          onChange={(e) =>
            setFormData({
              ...formData,
              slug: e.target.value,
            })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="my-awesome-project"
        />
        <p className="mt-1 text-sm text-gray-500">
          Lowercase letters, numbers, and hyphens only
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Integrations
        </label>
        <div className="space-y-2">
          {Object.entries(formData.integrations).map(([key, value]) => (
            <label key={key} className="flex items-center">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    integrations: {
                      ...formData.integrations,
                      [key]: e.target.checked,
                    },
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700 capitalize">{key}</span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create Project"}
        </button>
      </div>
    </form>
  );
}
