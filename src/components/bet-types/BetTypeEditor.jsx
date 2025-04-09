// src/components/bet-types/BetTypeEditor.jsx
import React from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Info, Calculator, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function BetTypeEditor({
  open,
  onOpenChange,
  form,
  onSubmit,
  isPending,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Chỉnh sửa loại cược</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin cho loại cược
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow pr-4 max-h-[calc(90vh-180px)]">
          <Form {...form}>
            <form
              id="edit-bet-type-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-2"
            >
              <Tabs defaultValue="basic">
                <TabsList className="w-full">
                  <TabsTrigger value="basic">Thông tin cơ bản</TabsTrigger>
                  <TabsTrigger value="rates">Tỷ lệ & Hệ số</TabsTrigger>
                  <TabsTrigger value="regions">Khu vực áp dụng</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên loại cược</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="aliases"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bí danh</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Nhập các bí danh, cách nhau bằng dấu phẩy"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bet_rule"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quy tắc cược</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Mỗi quy tắc trên một dòng"
                            className="h-20"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="matching_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phương thức đối chiếu</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Kích hoạt</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Loại cược sẽ được hiển thị cho người dùng
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="rates" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="multiplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <Calculator className="mr-2 h-4 w-4" />
                          Hệ số nhân mặc định
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            placeholder="Nhập hệ số nhân (ví dụ: 1)"
                            {...field}
                          />
                        </FormControl>
                        <div className="text-xs text-amber-500 mt-1 flex items-start">
                          <Info className="h-3 w-3 mt-0.5 mr-1" />
                          <span>
                            Hệ số nhân mặc định cho loại cược này. Có thể được
                            điều chỉnh cho từng người dùng.
                          </span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payout_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tỷ lệ trả thưởng</FormLabel>
                        <div className="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 rounded-md p-2 mb-2 flex items-start">
                          <AlertTriangle className="h-4 w-4 mt-0.5 mr-1 flex-shrink-0" />
                          <span className="text-xs">
                            Tỷ lệ trả thưởng theo định dạng JSON. Ví dụ: 75 (đơn
                            giản) hoặc {"{'2 digits': 75, '3 digits': 650}"}{' '}
                            (phức tạp).
                          </span>
                        </div>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder='{
"2 digits": 75,
"3 digits": 650,
"4 digits": 5500
}'
                            className="h-40 font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="regions" className="mt-4">
                  <FormField
                    control={form.control}
                    name="applicable_regions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Áp dụng cho miền</FormLabel>
                        <div className="grid grid-cols-1 gap-3 mt-2">
                          <div className="flex items-center space-x-2 border p-3 rounded-md">
                            <Checkbox
                              id="north"
                              checked={field.value?.includes('north')}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, 'north']);
                                } else {
                                  field.onChange(
                                    field.value?.filter(
                                      (region) => region !== 'north'
                                    )
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor="north"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Miền Bắc
                            </label>
                          </div>

                          <div className="flex items-center space-x-2 border p-3 rounded-md">
                            <Checkbox
                              id="central"
                              checked={field.value?.includes('central')}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, 'central']);
                                } else {
                                  field.onChange(
                                    field.value?.filter(
                                      (region) => region !== 'central'
                                    )
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor="central"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Miền Trung
                            </label>
                          </div>

                          <div className="flex items-center space-x-2 border p-3 rounded-md">
                            <Checkbox
                              id="south"
                              checked={field.value?.includes('south')}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, 'south']);
                                } else {
                                  field.onChange(
                                    field.value?.filter(
                                      (region) => region !== 'south'
                                    )
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor="south"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Miền Nam
                            </label>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button type="submit" form="edit-bet-type-form" disabled={isPending}>
            {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
