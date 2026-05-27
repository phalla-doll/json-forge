import { JsonForgeApp } from "@/components/json-forge-app";

const INITIAL_DATA = {
  manufacturers: [
    {
      id: "bmw",
      name: "BMW Group",
      country: "Germany",
      isActive: true,
      foundedYear: 1916,
      website: "https://www.bmwgroup.com",
      rating: 4.6,
      lastUpdated: "2025-01-15T10:30:00Z",
      brands: [
        {
          id: "bmw-brand",
          name: "BMW",
          isLuxury: true,
          supportsEV: true,
          models: [
            {
              id: "bmw-3-series",
              name: "3 Series",
              segment: "Sedan",
              isDiscontinued: false,
              releaseYears: [2021, 2022, 2023, 2024],
              availableMarkets: ["US", "EU", "JP"],
              defaultCurrency: "USD",
            },
          ],
        },
      ],
    },
  ],
};

export default function Page() {
  return <JsonForgeApp initialJson={JSON.stringify(INITIAL_DATA, null, 4)} />;
}
