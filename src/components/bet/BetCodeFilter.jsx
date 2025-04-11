// src/components/bet/BetCodeFilter.jsx
import React, { useState, useEffect } from 'react'
import { useBetCode } from '@/contexts/BetCodeContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, RotateCcw, X, Info } from 'lucide-react'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const BetCodeFilter = () => {
  const { filterCodes, getFilteredCodes } = useBetCode()
  const [searchText, setSearchText] = useState('')
  const [searchTimeout, setSearchTimeout] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [matchCount, setMatchCount] = useState(0)

  // Handle search input change with debounce
  const handleSearchChange = (e) => {
    const { value } = e.target
    setSearchText(value)
    setIsSearching(true)

    // Debounce search to avoid too many filter operations
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    const timeoutId = setTimeout(() => {
      if (value.trim() === '') {
        filterCodes(null) // Clear filter if search is empty
        setIsSearching(false)
        setMatchCount(0)
      } else {
        filterCodes({ searchText: value })
        setIsSearching(false)
      }
    }, 300)

    setSearchTimeout(timeoutId)
  }

  // Clear search
  const handleClearSearch = () => {
    setSearchText('')
    filterCodes(null)
    setMatchCount(0)
    toast.success('Đã xóa tìm kiếm')
  }

  // Update match count when filtered codes change
  useEffect(() => {
    if (searchText.trim() !== '') {
      const filteredCodeCount = getFilteredCodes().length
      setMatchCount(filteredCodeCount)
    }
  }, [searchText, getFilteredCodes])

  return (
    <div className='space-y-3'>
      <div className='flex items-center gap-2'>
        <div className='relative flex-1'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            type='text'
            placeholder='Tìm theo số, đài, kiểu cược...'
            value={searchText}
            onChange={handleSearchChange}
            className={`pl-9 ${searchText && 'pr-16'}`}
          />
          {searchText && (
            <div className='absolute right-2.5 top-2.5 flex items-center gap-1.5'>
              {isSearching ? (
                <div className='text-xs text-muted-foreground animate-pulse'>
                  Đang tìm...
                </div>
              ) : (
                <div className='text-xs text-muted-foreground'>
                  {matchCount} kết quả
                </div>
              )}
              <Button
                variant='ghost'
                size='icon'
                className='h-5 w-5'
                onClick={() => {
                  setSearchText('')
                  filterCodes(null)
                }}>
                <X className='h-3 w-3' />
              </Button>
            </div>
          )}
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={handleClearSearch}
          disabled={!searchText}
          className='h-10 whitespace-nowrap'>
          <RotateCcw className='h-3.5 w-3.5 mr-1.5' />
          Xóa tìm kiếm
        </Button>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' className='h-10 w-10'>
                <Info className='h-4 w-4 text-muted-foreground' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className='text-xs max-w-xs'>
                Tìm kiếm theo: số cược, đài, kiểu cược (dd, b, da...), hoặc bất
                kỳ nội dung nào trong mã cược.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

export default BetCodeFilter
