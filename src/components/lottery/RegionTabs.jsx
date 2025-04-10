// src/components/lottery/RegionTabs.jsx
'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

export function RegionTabs({ regions, defaultValue, onChange, children }) {
  const [value, setValue] = useState(defaultValue || 'all');

  const handleValueChange = (newValue) => {
    setValue(newValue);
    if (onChange) onChange(newValue);
  };

  return (
    <Tabs value={value} onValueChange={handleValueChange} className="w-full">
      <TabsList className="grid grid-cols-4 mb-4">
        <TabsTrigger value="all">Tất cả</TabsTrigger>
        {regions.map((region) => (
          <TabsTrigger key={region.id} value={region.id.toString()}>
            {region.name}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="all">
        <Card>
          <CardContent className="p-4">{children}</CardContent>
        </Card>
      </TabsContent>

      {regions.map((region) => (
        <TabsContent key={region.id} value={region.id.toString()}>
          <Card>
            <CardContent className="p-4">{children}</CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
