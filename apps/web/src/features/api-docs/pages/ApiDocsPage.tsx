import { SEOHead, StructuredData } from '@/components/common';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://svg2ico.com/' },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'API Documentation',
      item: 'https://svg2ico.com/api-docs',
    },
  ],
};

export function ApiDocsPage() {
  return (
    <div className="h-screen w-full">
      <SEOHead
        title="API Documentation - SVG to ICO Conversion API | svg2ico"
        description="REST API reference for programmatic SVG and PNG to ICO and ICNS conversion. Free developer API with no authentication required."
        path="/api-docs"
      />
      <StructuredData data={breadcrumbSchema} />
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
