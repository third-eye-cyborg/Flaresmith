import { CreateProjectForm } from "../../../src/components/projects/CreateProjectForm";

/**
 * T058: Create project creation page with integration selection
 * Page for creating new projects
 */

export default function NewProjectPage() {
  // TODO: Get orgId from user session
  const orgId = "default-org-id";

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
        <p className="mt-2 text-sm text-gray-600">
          Set up a new CloudMake project with automated provisioning for GitHub, Neon, Cloudflare,
          and Postman.
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <CreateProjectForm orgId={orgId} />
        </div>
      </div>
    </div>
  );
}
