import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

export function ApiDocsPage() {
  return (
    <div className="h-screen w-full">
      <ApiReferenceReact
        configuration={{
          url: '/api/openapi-json',
          theme: 'default',
          // Hide the test request button to avoid Vue injection errors in React wrapper
          // See: https://github.com/scalar/scalar/pull/4047
          hideTestRequestButton: true,
        }}
      />
    </div>
  );
}
