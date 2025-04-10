// src/components/lottery/DateSelector.jsx
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';

export function DateSelector({ date, onChange }) {
  const [selectedDate, setSelectedDate] = useState(
    date ? new Date(date) : new Date()
  );

  useEffect(() => {
    if (date && date !== format(selectedDate, 'yyyy-MM-dd')) {
      setSelectedDate(new Date(date));
    }
  }, [date]);

  const handleSelect = (date) => {
    setSelectedDate(date);
    if (onChange) {
      onChange(format(date, 'yyyy-MM-dd'));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start w-full md:w-auto">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate
            ? format(selectedDate, 'EEEE, dd/MM/yyyy', { locale: vi })
            : 'Chọn ngày'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={(date) =>
            date > new Date() || date < new Date('2023-01-01')
          }
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
