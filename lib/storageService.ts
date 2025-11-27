import { createClient } from '@supabase/supabase-js';

// Use supabaseAdmin from server/supabaseAdmin
const { supabaseAdmin } = require('../server/supabaseAdmin');
  },
});

/**
 * Upload receipt image to Supabase Storage
 * @param file - File buffer or Blob
 * @param userIdentifier - User email, telegram ID, or wallet address
 * @param fileExtension - File extension (jpg, png, etc.)
 * @returns Public URL of uploaded file
 */
export async function uploadReceiptImage(
  file: Buffer | Blob,
  userIdentifier: {
    email?: string;
    telegram_id?: string;
    wallet_address?: string;
  },
  fileExtension: string = 'jpg'
): Promise<{ url: string; path: string }> {
  try {
    // Generate unique storage path
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    
    // Create user folder based on identifier
    let userFolder = 'anonymous';
    if (userIdentifier.email) {
      userFolder = Buffer.from(userIdentifier.email).toString('base64').substring(0, 16);
    } else if (userIdentifier.telegram_id) {
      userFolder = `tg_${userIdentifier.telegram_id}`;
    } else if (userIdentifier.wallet_address) {
      userFolder = `wallet_${userIdentifier.wallet_address.substring(0, 10)}`;
    }

    const filePath = `${userFolder}/${timestamp}_${randomSuffix}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('receipts')
      .upload(filePath, file, {
        contentType: `image/${fileExtension}`,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('❌ Storage upload error:', error);
      throw new Error(`Failed to upload receipt: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('receipts')
      .getPublicUrl(filePath);

    console.log('✅ Receipt uploaded to storage:', filePath);

    return {
      url: publicUrlData.publicUrl,
      path: filePath,
    };
  } catch (error: any) {
    console.error('❌ Upload receipt error:', error);
    throw error;
  }
}

/**
 * Delete receipt image from storage
 * @param filePath - Storage path of file to delete
 */
export async function deleteReceiptImage(filePath: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.storage
      .from('receipts')
      .remove([filePath]);

    if (error) {
      console.error('❌ Storage delete error:', error);
      throw new Error(`Failed to delete receipt: ${error.message}`);
    }

    console.log('✅ Receipt deleted from storage:', filePath);
  } catch (error: any) {
    console.error('❌ Delete receipt error:', error);
    throw error;
  }
}

/**
 * Upload NFT image to storage
 * @param file - Image buffer or Blob
 * @param nftType - Type of NFT (bronze_tier, silver_tier, etc.)
 * @returns Public URL of uploaded file
 */
export async function uploadNFTImage(
  file: Buffer | Blob,
  nftType: string
): Promise<{ url: string; path: string }> {
  try {
    const filePath = `${nftType}.png`;

    const { data, error } = await supabaseAdmin.storage
      .from('nft-images')
      .upload(filePath, file, {
        contentType: 'image/png',
        cacheControl: '86400', // Cache for 24 hours
        upsert: true, // Allow overwriting
      });

    if (error) {
      console.error('❌ NFT image upload error:', error);
      throw new Error(`Failed to upload NFT image: ${error.message}`);
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('nft-images')
      .getPublicUrl(filePath);

    console.log('✅ NFT image uploaded:', filePath);

    return {
      url: publicUrlData.publicUrl,
      path: filePath,
    };
  } catch (error: any) {
    console.error('❌ Upload NFT image error:', error);
    throw error;
  }
}

/**
 * Upload business logo to storage
 * @param file - Image buffer or Blob
 * @param brandName - Brand name (starbucks, circle_k, etc.)
 * @returns Public URL of uploaded file
 */
export async function uploadBusinessLogo(
  file: Buffer | Blob,
  brandName: string
): Promise<{ url: string; path: string }> {
  try {
    const filePath = `${brandName.toLowerCase().replace(/\s+/g, '-')}.png`;

    const { data, error } = await supabaseAdmin.storage
      .from('business-logos')
      .upload(filePath, file, {
        contentType: 'image/png',
        cacheControl: '86400',
        upsert: true,
      });

    if (error) {
      console.error('❌ Logo upload error:', error);
      throw new Error(`Failed to upload logo: ${error.message}`);
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('business-logos')
      .getPublicUrl(filePath);

    console.log('✅ Business logo uploaded:', filePath);

    return {
      url: publicUrlData.publicUrl,
      path: filePath,
    };
  } catch (error: any) {
    console.error('❌ Upload logo error:', error);
    throw error;
  }
}

/**
 * Get public URL for a storage file
 * @param bucket - Bucket name
 * @param filePath - File path in bucket
 * @returns Public URL
 */
export function getPublicUrl(bucket: string, filePath: string): string {
  const { data } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * List all receipt images for a user
 * @param userFolder - User's folder name
 * @returns Array of file paths
 */
export async function listUserReceipts(userFolder: string): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('receipts')
      .list(userFolder, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('❌ List receipts error:', error);
      throw new Error(`Failed to list receipts: ${error.message}`);
    }

    return data?.map(file => `${userFolder}/${file.name}`) || [];
  } catch (error: any) {
    console.error('❌ List user receipts error:', error);
    throw error;
  }
}
