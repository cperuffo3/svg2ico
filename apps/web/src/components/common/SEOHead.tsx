import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://svg2ico.com';
const DEFAULT_OG_IMAGE = `${BASE_URL}/logo/og-image.png`;

interface SEOHeadProps {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  noindex?: boolean;
}

export function SEOHead({ title, description, path, ogImage, noindex }: SEOHeadProps) {
  const canonical = `${BASE_URL}${path}`;
  const image = ogImage ?? DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />

      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:url" content={canonical} />
      <meta name="twitter:image" content={image} />

      {noindex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
}
