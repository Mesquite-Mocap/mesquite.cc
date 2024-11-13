# mesquite.cc

Web app for IMU based motion capture.

## Usage

Clone this repository and run the following commands:

```bash
git clone https://github.com/Mesquite-Mocap/mesquite.cc/
cd mesquite.cc
[sudo] npm install -g http-server
http-server -p 9999
```

Navigate to `http://localhost:9999` in your browser.

Or just go to [mesquite.cc](https://mesquite.cc)


# Project Hardware Requirements

Below is a list of hardware required for the project (prices in USD):

<table class="waffle" cellspacing="0" cellpadding="0">
        <tbody>
            <tr style="height: 20px">
                <td class="s0" dir="ltr">Item</td>
                <td class="s0" dir="ltr">Link</td>
                <td class="s0" dir="ltr">Unit Price</td>
                <td class="s0" dir="ltr">Units</td>
                <td class="s0" dir="ltr">Total Price</td>
            </tr>
            <tr style="height: 20px">
                <td class="s1" dir="ltr">T-OI Plus (no batt holder)</td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.lilygo.cc/products/t-oi-plus">https://www.lilygo.cc/products/t-oi-plus</a>
                </td>
                <td class="s3" dir="ltr">5.5</td>
                <td class="s3" dir="ltr">14</td>
                <td class="s3">77</td>
            </tr>
            <tr style="height: 20px">
                <td class="s1" dir="ltr">T-ICM</td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.lilygo.cc/products/t-icm-20948">https://www.lilygo.cc/products/t-icm-20948</a>
                </td>
                <td class="s3" dir="ltr">5.22</td>
                <td class="s3" dir="ltr">14</td>
                <td class="s3">73.08</td>
            </tr>
            <tr style="height: 20px">
                <td class="s1" dir="ltr">LiPo Battery (800 mah)</td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://ydlbattery.com/products/3-7v-800mah-752248-lithium-polymer-ion-battery">https://ydlbattery.com/products/3-7v-800mah-752248-lithium-polymer-ion-battery</a>
                </td>
                <td class="s3" dir="ltr">4</td>
                <td class="s3" dir="ltr">14</td>
                <td class="s3">56</td>
            </tr>
            <tr style="height: 20px">
                <td class="s1" dir="ltr">Straps</td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.amazon.com/dp/B0D8KHDKCT?th=">https://www.amazon.com/dp/B0D8KHDKCT?th=</a>
                </td>
                <td class="s3" dir="ltr">18.99</td>
                <td class="s3" dir="ltr">1</td>
                <td class="s3">18.99</td>
            </tr>
            <tr style="height: 20px">
                <td class="s1" dir="ltr">Soldering Wires</td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.amazon.com/dp/B073SNPF2C/">https://www.amazon.com/dp/B073SNPF2C/</a></td>
                <td class="s3" dir="ltr">8.59</td>
                <td class="s3" dir="ltr">1</td>
                <td class="s3">8.59</td>
            </tr>
            <tr style="height: 20px">
                <td class="s1" dir="ltr">Magnetic charging</td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.amazon.com/HYDOOD-Magnetic-Charging-Compatible-Nylon-Braided/dp/B0B5MXDRKW/?th=1">https://www.amazon.com/HYDOOD-Magnetic-Charging-Compatible-Nylon-Braided/dp/B0B5MXDRKW/?th=1</a>
                </td>
                <td class="s3" dir="ltr">19.99</td>
                <td class="s3" dir="ltr">3</td>
                <td class="s3">59.97</td>
            </tr>
            <tr style="height: 20px">
                <td></td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.amazon.com/dp/B0BDWV1WHD/?th=1">https://www.amazon.com/dp/B0BDWV1WHD/?th=1</a>
                </td>
                <td class="s3" dir="ltr">9.99</td>
                <td class="s3" dir="ltr">2</td>
                <td class="s3">19.98</td>
            </tr>
            <tr style="height: 20px">
                <td class="s1" dir="ltr">Usb charging hub</td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.amazon.com/dp/B07ZNFMJT7/ref=sspa_dk_detail_4?th=1">https://www.amazon.com/dp/B07ZNFMJT7/ref=sspa_dk_detail_4?th=1</a>
                </td>
                <td class="s3" dir="ltr">24.99</td>
                <td class="s3" dir="ltr">1</td>
                <td class="s3">24.99</td>
            </tr>
            <tr style="height: 20px">
                <td class="s1" dir="ltr">Android phone</td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.amazon.com/Samsung-Galaxy-A102U-Unlocked-Phone/dp/B084KS5WYC/">https://www.amazon.com/Samsung-Galaxy-A102U-Unlocked-Phone/dp/B084KS5WYC/</a>
                </td>
                <td class="s3" dir="ltr">70</td>
                <td class="s3" dir="ltr">1</td>
                <td class="s3">70</td>
            </tr>
            <tr style="height: 20px">
                <td class="s1" dir="ltr"></td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.amazon.com/Supershieldz-Samsung-Tempered-Protector-Coverage/dp/B07VVDXTS1/">https://www.amazon.com/Supershieldz-Samsung-Tempered-Protector-Coverage/dp/B07VVDXTS1/</a>
                </td>
                <td class="s3" dir="ltr">7.99</td>
                <td class="s3" dir="ltr">1</td>
                <td class="s3">7.99</td>
            </tr>
            <tr style="height: 20px">
                <td></td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.amazon.com/IDYStar-Galaxy-A10E-Protector-Protective/dp/B08XVWTDVL/">https://www.amazon.com/IDYStar-Galaxy-A10E-Protector-Protective/dp/B08XVWTDVL/</a>
                </td>
                <td class="s3" dir="ltr">9.89</td>
                <td class="s3" dir="ltr">1</td>
                <td class="s3">9.89</td>
            </tr>
            <tr style="height: 20px">
                <td class="s1" dir="ltr">Wifi Router</td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.amazon.com/TP-Link-Wireless-Portable-Travel-Router/dp/B00TQEX8BO/">https://www.amazon.com/TP-Link-Wireless-Portable-Travel-Router/dp/B00TQEX8BO/</a>
                </td>
                <td class="s3" dir="ltr">26.99</td>
                <td class="s3" dir="ltr">1</td>
                <td class="s3">26.99</td>
            </tr>
            <tr style="height: 20px">
                <td class="s1" dir="ltr">Pi zero</td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.amazon.com/Vilros-Raspberry-Starter-Power-Premium/dp/B0748MPQT4?th=1">https://www.amazon.com/Vilros-Raspberry-Starter-Power-Premium/dp/B0748MPQT4?th=1</a>
                </td>
                <td class="s3" dir="ltr">34.99</td>
                <td class="s3" dir="ltr">1</td>
                <td class="s3">34.99</td>
            </tr>
            <tr style="height: 20px">
                <td></td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.amazon.com/gp/aw/d/B0BHNVLW1Z/">https://www.amazon.com/gp/aw/d/B0BHNVLW1Z/</a>
                </td>
                <td class="s3" dir="ltr">7.99</td>
                <td class="s3" dir="ltr">1</td>
                <td class="s3">7.99</td>
            </tr>
            <tr style="height: 20px">
                <td class="s1" dir="ltr">Hip holster</td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.amazon.com/dp/B01N23P91R">https://www.amazon.com/dp/B01N23P91R</a></td>
                <td class="s3" dir="ltr">11.99</td>
                <td class="s3" dir="ltr">1</td>
                <td class="s3">11.99</td>
            </tr>
            <tr style="height: 20px">
                <td class="s1" dir="ltr">Elastic band</td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.amazon.com/dp/B07RJQRJ1B">https://www.amazon.com/dp/B07RJQRJ1B</a></td>
                <td class="s3" dir="ltr">6.99</td>
                <td class="s3" dir="ltr">1</td>
                <td class="s3">6.99</td>
            </tr>
            <tr style="height: 20px">
                <td class="s1" dir="ltr">Belt buckles</td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.amazon.com/dp/B07V9NVZFR">https://www.amazon.com/dp/B07V9NVZFR</a></td>
                <td class="s3" dir="ltr">7.99</td>
                <td class="s3" dir="ltr">2</td>
                <td class="s3">15.98</td>
            </tr>
            <tr style="height: 20px">
                <td class="s1" dir="ltr">Push buttons</td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.amazon.com/Momentary-Tactile-Through-Breadboard-Friendly/dp/B07WF76VHT/">https://www.amazon.com/Momentary-Tactile-Through-Breadboard-Friendly/dp/B07WF76VHT/</a>
                </td>
                <td class="s3" dir="ltr">5.99</td>
                <td class="s3" dir="ltr">1</td>
                <td class="s3">5.99</td>
            </tr>
            <tr style="height: 20px">
                <td class="s1" dir="ltr">Sticker labels</td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.amazon.com/gp/product/B0CBRT2BTL">https://www.amazon.com/gp/product/B0CBRT2BTL</a>
                </td>
                <td class="s3" dir="ltr">10.5</td>
                <td class="s3" dir="ltr">1</td>
                <td class="s3">10.5</td>
            </tr>
            <tr style="height: 20px">
                <td class="s1" dir="ltr">Belt hanger</td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.amazon.com/dp/B0914XGJ8Q">https://www.amazon.com/dp/B0914XGJ8Q</a></td>
                <td class="s3" dir="ltr">5.99</td>
                <td class="s3" dir="ltr">1</td>
                <td class="s3">5.99</td>
            </tr>
            <tr style="height: 20px">
                <td class="s1" dir="ltr">Box</td>
                <td class="s2" dir="ltr"><a target="_blank"
                        href="https://www.amazon.com/dp/B08DNL54L6/">https://www.amazon.com/dp/B08DNL54L6/</a></td>
                <td class="s3" dir="ltr">24.99</td>
                <td class="s3" dir="ltr">1</td>
                <td class="s3">24.99</td>
            </tr>
            <tr style="height: 20px">
                <td class="s0" dir="ltr">TOTAL</td>
                <td class="s0"></td>
                <td class="s0"></td>
                <td class="s0"></td>
                <td class="s4"><b>578.88</b></td>
            </tr>
        </tbody>
</table>