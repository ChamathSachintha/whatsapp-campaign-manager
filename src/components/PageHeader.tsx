type PageHeaderProps = {
  title: string;
  description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="page-heading">
      <p className="eyebrow">YOUR OUTREACH, ORGANIZED</p>
      <h2>{title}</h2>
      <p className="page-description">{description}</p>
    </div>
  );
}
