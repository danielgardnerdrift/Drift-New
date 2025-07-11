#!/usr/bin/env python3
"""
Simple test script for the LangGraph Drift service.
"""

import asyncio
import aiohttp
import json


async def test_health_endpoint():
    """Test the health check endpoint."""
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get("http://localhost:8000/health") as response:
                if response.status == 200:
                    data = await response.json()
                    print("✅ Health check passed:")
                    print(json.dumps(data, indent=2))
                    return True
                else:
                    print(f"❌ Health check failed with status {response.status}")
                    return False
        except Exception as e:
            print(f"❌ Health check failed with error: {e}")
            return False


async def test_root_endpoint():
    """Test the root endpoint."""
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get("http://localhost:8000/") as response:
                if response.status == 200:
                    data = await response.json()
                    print("✅ Root endpoint passed:")
                    print(json.dumps(data, indent=2))
                    return True
                else:
                    print(f"❌ Root endpoint failed with status {response.status}")
                    return False
        except Exception as e:
            print(f"❌ Root endpoint failed with error: {e}")
            return False


async def main():
    """Run all tests."""
    print("🧪 Testing LangGraph Drift Service...")
    print("=" * 50)
    
    health_ok = await test_health_endpoint()
    print()
    root_ok = await test_root_endpoint()
    
    print()
    print("=" * 50)
    if health_ok and root_ok:
        print("🎉 All tests passed! Service is running correctly.")
    else:
        print("⚠️  Some tests failed. Check the service configuration.")


if __name__ == "__main__":
    asyncio.run(main())